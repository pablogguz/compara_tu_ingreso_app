
# Load required packages
library(shiny)
library(highcharter)
library(dplyr)
library(data.table)
library(fst)
library(scales)
library(purrr)
library(shinyjs)
library(bs4Dash)
library(bslib)
library(htmltools)
library(sf)
library(shinyWidgets)
library(leaflet)
library(googlesheets4)

# Load data
national_percentiles <- read_fst("data/national_percentiles.fst")
provincial_percentiles <- read_fst("data/provincial_percentiles.fst")
mun_percentiles <- read_fst("data/mun_percentiles.fst")

municipality_lookup <- read_fst("data/municipality_lookup.fst")
density_data <- read_fst("data/density_curve.fst")
density_data_prov <- read_fst("data/density_curve_prov.fst")
municipality_stats <- read_fst("data/municipality_stats.fst") 

# Create municipality choices for select input
municipality_choices <- as.character(municipality_lookup$mun_code)
names(municipality_choices) <- paste0(
    municipality_lookup$mun_name, 
    " (",  municipality_lookup$prov_name, ")"
    )

# Helper function to find percentile position
find_percentile <- function(value, percentiles) {
    if (value <= min(percentiles)) return(1)
    if (value >= max(percentiles)) return(100)
    max(which(percentiles <= value))
}

# Helper function to find value given percentile
find_value_for_percentile <- function(percentile, percentiles) {
    if (percentile <= 0) return(min(percentiles))
    if (percentile >= 100) return(max(percentiles))
    percentiles[percentile]
}

# Helper function to format currency
format_currency <- function(x) {
  paste0(format(round(x), big.mark = ".", decimal.mark = ","), " €")
}

# Helper function to calculate equivalised income
calculate_equiv_income <- function(monthly_income, adults, children) {
  adults <- as.numeric(adults)
  children <- as.numeric(children)

  # First adult counts as 1, additional adults as 0.5, children as 0.3
  equiv_scale <- 1 + (max(0, adults - 1) * 0.5) + (children * 0.3)
  # Convert to annual and equivalise
  (monthly_income * 12) / equiv_scale
}

# Store p99
p99 <- find_value_for_percentile(99, national_percentiles$value)

# Function to geocode an address
geocode_address <- function(address, municipality, province) {
    # Create full address with municipality, province and country
    full_address <- sprintf("%s, %s, %s, España", address, municipality, province)
    print(paste("Searching for:", full_address))
    
    # Create a data frame for the address
    address_df <- tibble::tibble(address = full_address)
    
    # Geocode using the arcgis method
    result <- address_df %>%
        geocode(address = address, method = "arcgis")
    
    print(str(result))
    
    if (nrow(result) == 0 || is.na(result$lat[1]) || is.na(result$long[1])) {
        return(NULL)
    }
    
    return(list(lat = result$lat[1], lng = result$long[1]))
}

# Initialize Google Sheets authentication
gs4_auth(path = "data/comparatuingreso-37202e902119.json")

# Barrios modal
indicators <- data.frame(
    value = c("income", "percentile", "education", "foreign"), # , "salary"
    label = c("Ingreso medio equivalente", "Percentil de ingreso (nacional)", "Estudios superiores", "Población extranjera"), # , "Salario bruto medio"
    year = c("2022", "2022", "2021", "2021") # , "2021"
)
indicator_choices <- setNames(indicators$value, indicators$label)

tractModalUI <- function(selected_mun, municipality_choices) {
    modalDialog(
        title = div(
            class = "d-flex align-items-center",
            style = "position: relative; padding-right: 2rem;", # Ensure space for the close button
            icon("map-marked-alt"),
            span("Datos por secciones censales", class = "ml-2"),
            actionButton(
                inputId = "close_modal_map",
                label = NULL,
                icon = icon("times"), # Font Awesome "times" icon
                class = "btn btn-link",
                style = "position: absolute; top: -10px; right: -365px;"
            )
        ),
        
        div(
        class = "tract-modal",
            # Municipality selector
            div(
                class = "selectors-container",
                style = "margin-bottom: 1rem;",
                # Using grid for responsive layout
                div(
                    style = "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0rem;",
                    # Municipality selector
                    div(
                        pickerInput(
                            "modal_municipality", 
                            label = "Selecciona un municipio:",
                            choices = municipality_choices,
                            selected = selected_mun,
                            options = list(
                                placeholder = "Selecciona un municipio",
                                `live-search` = TRUE,
                                liveSearchNormalize = TRUE,
                                `live-search-normalize` = TRUE,
                                pickerOptions = list(
                                    liveSearchNormalize = TRUE
                                )
                            )
                        )
                    ),
                    # Metric selector  
                    div(
                        pickerInput(
                            "modal_metric",
                            label = "Selecciona un indicador:",
                            choices = indicator_choices,
                            selected = "income",
                            options = list(
                                placeholder = "Selecciona indicador:",
                                `live-search` = TRUE
                            ),
                            choicesOpt = list(
                                subtext = indicators$year
                            )
                        )
                    )
                )
            ),

            # Map with loading spinner
            div(
                class = "tract-map-wrapper",
                uiOutput("tract_content", height = "500px")
            ),
            
            # Help text
            div(
                class = "tract-help-text",
                "Puedes desplazarte por el mapa y hacer zoom para ver los barrios de cada municipio. Si quieres saber más
                sobre los datos, consulta la sección de ayuda en la esquina inferior derecha."
            )
        ),
        size = "l",
        easyClose = TRUE,
        footer = modalButton("Cerrar")
    )
}

# ## Serve htmlwidgets core JS (e.g. /htmlwidgets-1.6.4/htmlwidgets.js)
# shiny::addResourcePath(
#   sprintf("htmlwidgets-%s", as.character(utils::packageVersion("htmlwidgets"))),
#   system.file("www", package = "htmlwidgets")
# )

# ## Serve the highcharter widget binding (e.g. /highchart-binding-0.9.4/highchart.js)
# shiny::addResourcePath(
#   sprintf("highchart-binding-%s", as.character(utils::packageVersion("highcharter"))),
#   system.file("htmlwidgets", package = "highcharter")
# )

# ## Serve the Highcharts libs directory highcharter bundles (e.g. /highcharts-9.3.1/*)
# hc_lib_root <- system.file("htmlwidgets", "lib", package = "highcharter")
# if (nzchar(hc_lib_root) && dir.exists(hc_lib_root)) {
#   # Map any versioned subdir shipped by highcharter (highcharts-*, proj4*, moment*, etc.)
#   for (d in list.dirs(hc_lib_root, recursive = FALSE, full.names = FALSE)) {
#     shiny::addResourcePath(d, file.path(hc_lib_root, d))
#   }
# }