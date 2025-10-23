server <- function(input, output, session) {

    # keep alive 
    keep_alive <- shiny::reactiveTimer(intervalMs = 10000, session = shiny::getDefaultReactiveDomain())
    shiny::observe({keep_alive()})

    view_type <- reactiveVal("national")
    transitioning <- reactiveVal(FALSE)

    # Add observers for buttons with debouncing and animation handling
    observeEvent(input$show_national, {
        if (!transitioning()) {
            transitioning(TRUE)
            view_type("national")
            # Use invalidateLater to ensure smooth transition
            invalidateLater(300)
            transitioning(FALSE)
        }
    })

    observeEvent(input$show_provincial, {
        if (!transitioning()) {
            transitioning(TRUE)
            view_type("provincial")
            invalidateLater(300)
            transitioning(FALSE)
        }
    })

    observeEvent(input$show_municipal, {
        if (!transitioning()) {
            transitioning(TRUE)
            view_type("municipal")
            invalidateLater(300)
            transitioning(FALSE)
        }
    })

    # Validate inputs
    observe({
        income <- input$ingresos_netos
        if (!is.na(income)) {
            if (income <= 0 || income > 50000) {
                shinyjs::show("income-error")
            } else {
                shinyjs::hide("income-error")
            }
        }
    })

    # Initialize selectize input
    updateSelectizeInput(session, "municipio",
        selected = "Aranjuez (Madrid)",
        choices = municipality_choices,
        server = TRUE
    )

    # Tract-level stats
    rv <- reactiveValues(
        current_prov = NULL,
        geoms = NULL,
        current_metric = "income",
        first_modal_open = TRUE,
        tract_metric = "income",
        tract_data = NULL,
        last_selected_mun = NULL,
        is_modal_reopening = FALSE  # Add this to track modal reopening
    )

    
    #~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    # ------------------------------------------------------------------------------------
    # ---------------------------------- Store responses ---------------------------------
    # ------------------------------------------------------------------------------------
    #~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    observeEvent(input$calcular, {
        # Initialize JavaScript to R communication for consent
        runjs("
            Shiny.setInputValue('cookieConsent', localStorage.getItem('cookieConsent'));
        ")
        
        # Check if consent exists and is accepted
        if(!is.null(input$cookieConsent) && input$cookieConsent == 'accepted') {
            # Calculate equivalent income and percentile
            equiv_income <- calculate_equiv_income(
                input$ingresos_netos,
                input$adultos,
                input$menores
            )
            actual_percentile <- find_percentile(equiv_income, national_percentiles$value)
            
            # Prepare data for storage
            response_data <- data.frame(
                timestamp = format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
                municipality = input$municipio,
                monthly_income = input$ingresos_netos,
                adults = input$adultos,
                children = input$menores,
                perceived_percentile = input$percepcion,
                actual_percentile = actual_percentile,
                equiv_income = equiv_income
            )
            
            # Append to Google Sheet
            sheet_append(
                ss = "REDACTED_SHEET_ID",
                data = response_data
            )
        }
    })

    #~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    # ------------------------------------------------------------------------------------
    # ---------------------------------- Main section ----------------------------------
    # ------------------------------------------------------------------------------------
    #~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    results <- eventReactive(input$calcular, {
        
        req(input$ingresos_netos, input$adultos, input$menores)
        
        equiv_income <- calculate_equiv_income(
            input$ingresos_netos,
            input$adultos,
            input$menores
        )
        
        selected_prov <- municipality_lookup[
            municipality_lookup$mun_code == input$municipio, 
        ]$prov_code
        
        # Read relevant columns from the municipal percentiles file
        mun_percentiles <- read_fst(
            "data/mun_percentiles.fst",
            columns = c("percentile", input$municipio)
        )

        list(
            equiv_income = equiv_income,
            national_percentile = find_percentile(equiv_income, national_percentiles$value),
            provincial_percentile = find_percentile(equiv_income, provincial_percentiles[[selected_prov]]),
            municipal_percentile = find_percentile(equiv_income, mun_percentiles[[input$municipio]]),
            selected_prov = selected_prov
        )

    })

    output$distribucion <- renderHighchart({
        req(results())

        current_data <- switch(view_type(),
            "national" = density_data,
            "provincial" = density_data_prov %>%
                filter(prov_code == results()$selected_prov),
            "municipal" = {
                # Map municipio to province code
                prov_code <- municipality_lookup[
                    municipality_lookup$mun_code == input$municipio, 
                ]$prov_code
                
                # Load and filter the municipal-level density data
                mun_density <- read_fst(
                    file.path("data/density_curve_mun", paste0("mun_", prov_code, ".fst"))
                )
                
                mun_density %>% filter(mun_code == input$municipio)
            }
        )
    
        # Get correct percentile
        current_percentile <- switch(view_type(),
            "national" = results()$national_percentile,
            "provincial" = results()$provincial_percentile,
            "municipal" = results()$municipal_percentile
        )

        if (current_percentile > 99) {
            current_percentile <- ">99"
        }

        # Determine the view type and retrieve the appropriate percentiles
        current_percentile_values <- switch(view_type(),
            "national" = national_percentiles$value,
            "provincial" = provincial_percentiles[[results()$selected_prov]],
            "municipal" = mun_percentiles[[input$municipio]]
        )

        # Calculate the x-axis limit as the 99th percentile
        effective_max <- find_value_for_percentile(99, current_percentile_values)

        chart <- highchart() %>%
            hc_chart(
                style = list(fontFamily = "Open Sans")
            ) %>%
            hc_add_series(
                data = current_data,
                name = switch(view_type(),
                    "national" = "Distribución nacional",
                    "provincial" = "Distribución provincial",
                    "municipal" = "Distribución municipal"
                ),
                type = "area",
                color = "#58a2ec",
                fillOpacity = 0.3,
                animation = list(
                    duration = 1200
                ),
            ) %>%
            hc_tooltip(
                formatter = JS("function() {
                    if (this.series.name === 'Tu posición') {
                        return '<b>Tu posición:</b><br/>' +
                                'Ingresos: ' + this.point.displayValue + ' €<br/>' +
                                'Percentil: ' + this.point.percentile.toString()
                    } else if (this.series.name === 'Tu predicción') {
                        return '<b>Tu predicción:</b><br/>' +
                                'Ingresos: ' + this.point.displayValue + ' €<br/>' +
                                'Percentil: ' + this.point.percentile.toString()
                    } else {
                        return false;
                    }
                }")
            ) %>%
            hc_xAxis(
                min = 0,
                max = effective_max,
                title = list(
                    text = "Ingresos anuales equivalentes",
                    style = list(fontSize = "16px")
                ),
                labels = list(
                    formatter = JS("function() {
                        return Math.round(this.value).toLocaleString('es-ES') + ' €'
                    }"),
                    style = list(fontSize = "14px")
                )
            ) %>%
            hc_yAxis(
                title = list(text = ""),
                labels = list(enabled = FALSE),
                gridLineWidth = 0
            ) %>%
            hc_legend(
                align = "left",
                verticalAlign = "top",
                layout = "horizontal"
            ) %>%
            hc_exporting(
                enabled = FALSE,
                buttons = list(
                    contextButton = list(
                        menuItems = list("downloadPNG", "downloadJPEG", "downloadPDF", "downloadSVG")
                    )
                )
            ) %>%
            hc_caption( 
                text = "Los ingresos equivalentes tienen en cuenta el tamaño y composición del hogar para hacer comparables hogares distintos en términos de nivel de vida. La distribución se calcula utilizando datos de declaraciones de IRPF a nivel de sección censal para el año 2023. Si quieres saber más, consulta la sección de ayuda en la esquina inferior derecha.",
                align = "left",
                style = list(
                    fontSize = "10px",
                    color = "#adadad"
                ),
                y = 15
            )

        if (results()$equiv_income > effective_max) {
            x_axis <- effective_max - 0.01 * effective_max
            display_label <- paste0(">", format(round(x_axis), big.mark=".", decimal.mark=","))
        } else {
            x_axis <- results()$equiv_income
        }

        if (view_type() == "national") {
            predicted_x <- find_value_for_percentile(input$percepcion, national_percentiles$value)
            # Calculate if lines are close
            distance <- abs(x_axis - predicted_x) / (max(current_data$x) - min(current_data$x))

            stagger_labels <- distance < 0.05
            # Set y positions for both labels
            label1_y <- if(stagger_labels) -10 else 0
            label2_y <- if(stagger_labels) -30 else 0
        } else {
            label1_y <- 0  # Default position when only one line
        }

        chart <- chart %>%
            hc_add_series(
                data = list(
                    list(x = x_axis, y = 0, percentile = current_percentile,
                        displayValue = if(results()$equiv_income > effective_max) display_label else format(round(x_axis), big.mark=".", decimal.mark=",")),
                    list(x = x_axis, y = 1.15 * max(current_data$y), percentile = current_percentile,
                        displayValue = if(results()$equiv_income > effective_max) display_label else format(round(x_axis), big.mark=".", decimal.mark=","))
                ),
                name = "Tu posición",
                type = "line",
                color = "#155494",
                lineWidth = 2,
                dashStyle = "Dash",
                showInLegend = TRUE,
                marker = list(enabled = FALSE),
                animation = list(
                    duration = 1000
                ),
                label = list(
                    enabled = TRUE,
                    useHTML = TRUE,
                    connectorAllowed = TRUE,
                    style = list(fontWeight = "bold", fontSize = "12px"),
                    y = label1_y,  # Fixed distance above line
                    x = -10,
                    format = paste0(
                        "<div style='background: white; padding: 3px 6px; border-radius: 4px;'>",
                        "Tu posición",
                        "</div>"
                    )
                )
            )

        # Add prediction line only for national view
        if (view_type() == "national") {
            # Calculate x position based on the predicted percentile
            predicted_x <- find_value_for_percentile(input$percepcion, national_percentiles$value)

            chart <- chart %>%
                hc_add_series(
                    data = list(
                        list(x = predicted_x, y = 0, percentile = input$percepcion, displayValue = format(round(predicted_x), big.mark=".", decimal.mark=",")),
                        list(x = predicted_x, y = 1.15 * max(current_data$y), percentile = input$percepcion, displayValue = format(round(predicted_x), big.mark=".", decimal.mark=","))
                    ),
                    name = "Tu predicción",
                    type = "line",
                    color = "#e74c3c",  # Red color for contrast
                    lineWidth = 2,
                    dashStyle = "Dash",
                    showInLegend = TRUE,
                    marker = list(enabled = FALSE),
                    label = list(
                        enabled = TRUE,
                        useHTML = TRUE,
                        connectorAllowed = TRUE,
                        style = list(fontWeight = "bold", fontSize = "12px"),
                        y = label2_y,
                        format = paste0(
                            "<div style='background: white; padding: 3px 6px; border-radius: 4px;'>",
                            "Tu predicción",
                            "</div>"
                        )
                    )
                )
        }

        # Modify the responsive rules based on view type
        chart <- chart %>%
            hc_responsive(
                rules = list(
                    list(
                        condition = list(maxWidth = 500),
                        chartOptions = list(
                            series = if(view_type() != "national") {
                                list(
                                    list(  # Area series (distribution)
                                        type = "area"
                                    ),
                                    list(  # Position line
                                        type = "line",
                                        label = list(
                                            style = list(fontSize = "10px")
                                        )
                                    )
                                )
                            } else {
                                list(
                                    list(  # Area series (distribution)
                                        type = "area"
                                    ),
                                    list(  # Position line
                                        type = "line",
                                        label = list(
                                            style = list(fontSize = "10px")
                                        )
                                    ),
                                    list(  # Prediction line
                                        type = "line",
                                        label = list(
                                            style = list(fontSize = "10px")
                                        )
                                    )
                                )
                            }
                        )
                    )
                )
            )
    })

    output$resultados <- renderUI({
        req(results())
        
        # Get municipality name
        mun_name <- municipality_lookup[
            municipality_lookup$mun_code == input$municipio, 
        ]$mun_name

        current_percentile <- switch(view_type(),
            "national" = results()$national_percentile,
            "provincial" = results()$provincial_percentile,
            "municipal" = results()$municipal_percentile
        )

        current_percentile <- min(99, current_percentile)

        show_title <- switch(view_type(),
            "national" = "España",
            "provincial" = municipality_lookup[
                municipality_lookup$mun_code == input$municipio, 
            ]$prov_name,
            "municipal" = municipality_lookup[
                municipality_lookup$mun_code == input$municipio, 
            ]$mun_name
        )

        reference_income <- find_value_for_percentile(50, national_percentiles$value)
        user_income <- results()$equiv_income
        income_diff_pct <- round((user_income - reference_income) / reference_income * 100, 1)

        tagList(
            # Animation initialization
            tags$script("
                $(document).ready(function() {
                    // Coordinated animations
                    setTimeout(function() { 
                        $('.results-hero').addClass('visible');
                        $('.distribution-title').addClass('visible');
                    }, 100);
                    
                    setTimeout(function() { 
                        $('.distribution-container').addClass('visible');
                    }, 100);
                    
                    setTimeout(function() { 
                        $('.stats-container').addClass('visible');
                    }, 900);
                });
            "),
            
            div(class = "results-container",
                # Combined hero and distribution section
                div(class = "main-results-section",
                    # Compact hero section
                    div(class = "results-hero",
                        div(class = "hero-content",
                            div(class = "hero-background",
                                div(class = "hero-circle"),
                                div(class = "hero-circle hero-circle-2")
                            ),
                            
                            # Main percentile display and text in a row
                            div(class = "result-header",
                                div(class = "percentile-display",
                                    span(class = "percentile-number", sprintf("%.0f", current_percentile)),
                                    span(class = "percentile-symbol", "%")
                                ),
                                div(class = "result-text",
                                    if (current_percentile <= 1) {
                                        sprintf("En 2023, tu hogar estuvo entre el 1%% más pobre de %s", show_title)
                                    } else {
                                        sprintf("En 2023, tu hogar ingresó más que el %.0f%% de la población en %s",
                                            current_percentile, show_title)
                                    }
                                )
                            )
                            
                        )
                    ),
                    
                    # Distribution section with prominent chart
                    div(class = "distribution-container",
                        # View toggles

                        actionButton("show_national", "Nacional", 
                            class = if(view_type() == "national") "nav-button active" else "nav-button"),
                        actionButton("show_provincial", "Provincial", 
                            class = if(view_type() == "provincial") "nav-button active" else "nav-button"),
                        actionButton("show_municipal", "Municipal", 
                            class = if(view_type() == "municipal") "nav-button active" else "nav-button"),
                        # # New tract view button
                        # actionButton("show_tracts", "Ver por barrios", 
                        #     icon = icon("map-marked-alt"),
                        #     class = "nav-button"
                        # ),

                        # Flex container for chart and stats
                        div(
                            class = "chart-controls-container",
                            # Chart column (larger)
                            div(
                                class = "chart-container",
                                highchartOutput("distribucion", height = "500px")
                            ),
                            # Stats column
                            div(
                                class = "stats-container",
                                div(
                                    class = "stats-title",
                                    icon("chart-bar"),
                                    span("Estadísticas de tu municipio")
                                ),
                                valueBoxOutput("income_equiv_box", width = 12),
                                #valueBoxOutput("avg_salary_box", width = 12),
                                valueBoxOutput("higher_ed_box", width = 12),
                                valueBoxOutput("foreign_box", width = 12)
                            )
                        )
                    )
                ),
                
            )
        )
    })

    # Render value boxes ---------------------------------------------------------------
    output$higher_ed_box <- renderValueBox({
        req(input$municipio)
        stats <- municipality_stats[municipality_stats$mun_code == input$municipio, ]
        
        subtitle <- "Población de 15 y más años con estudios superiores (2023)"
        if (stats$pct_higher_ed_completed_is_imputed == 1) {
            subtitle <- "Población de 15 y más años con estudios superiores (2023, media provincial)"
        }
        
        valueBox(
            value = paste0(round(stats$pct_higher_ed_completed, 1), "%"),
            subtitle = subtitle,
            icon = icon("graduation-cap"),
            color = "warning",
            width = 12
        )
    })

    output$income_equiv_box <- renderValueBox({
        req(input$municipio)

        stats <- municipality_stats[municipality_stats$mun_code == input$municipio, ]

        subtitle <- "Ingreso medio equivalente (2023)"
        if (stats$net_income_equiv_is_imputed == 1) {
            subtitle <- "Ingreso medio equivalente (2023, media provincial)"
        }
        
        valueBox(
            value = format_currency(stats$net_income_equiv),
            subtitle = subtitle,
            icon = icon("fas fa-euro-sign"),
            color = "success",
            width = 12
        )
    })

    # output$avg_salary_box <- renderValueBox({
    #     req(input$municipio)
    #     stats <- municipality_stats[municipality_stats$mun_code == input$municipio, ]
        
    #     subtitle <- "Salario bruto medio (2021)"
    #     if (stats$avg_salary_is_imputed == 1) {
    #         subtitle <- "Salario bruto medio (2021, media provincial)"
    #     }
        
    #     valueBox(
    #         value = format_currency(stats$avg_salary),
    #         subtitle = subtitle,
    #         icon = icon("fas fa-euro-sign"),
    #         color = "info",
    #         width = 12
    #     )
    # })

    output$foreign_box <- renderValueBox({
        req(input$municipio)
        stats <- municipality_stats[municipality_stats$mun_code == input$municipio, ]
        
        subtitle <- "Población nacida en el extranjero (2024)"
        if (stats$pct_foreign_born_is_imputed == 1) {
            subtitle <- "Población nacida en el extranjero (2024, media provincial)"
        }
        
        valueBox(
            value = paste0(round(stats$pct_foreign_born, 1), "%"),
            subtitle = subtitle,
            icon = icon("fas fa-globe"),
            color = "primary",
            width = 12
        )
    })

    # Helper modal ---------------------------------------------------------------
    observeEvent(input$show_help, {
        showModal(
            modalDialog(
                title = div(
                    style = "position: relative; padding-right: 2rem;", # Ensure space for the button
                    "Instrucciones y dudas frecuentes",
                    actionButton(
                        inputId = "close_modal",
                        label = NULL,
                        icon = icon("times"), # Font Awesome "times" icon
                        class = "btn btn-link",
                        style = "position: absolute; top: -10px; right: -350px; color: black;"
                    )
                ),
                tabsetPanel(
                    type = "pills",
                    tabPanel("Datos",
                        tags$div(
                            class = "help-content",
                            tags$h4("¿De dónde vienen los datos?"), 
                            tags$p( 
                                "El Atlas de Distribución de Renta de los Hogares (ADRH) es una estadística oficial del Institutio Nacional de Estadística  (INE) que proporciona información sobre el nivel y la distribución de la renta de la población a un nivel territorial muy detallado. Los datos se publican anualmente, siendo los últimos disponibles los correspondientes al año 2023.
                                Puedes consultar todos los detalles en la ",
                                tags$a(
                                    href = "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177088&menu=ultiDatos&idp=1254735976608",
                                    target = "_blank",
                                    "página oficial del INE."
                                )
                            ),

                            tags$h5("Fuentes de datos", class = "mt-4 mb-2"),
                            tags$ul(
                                tags$li("Registros administrativos de declaraciones tributarias (IRPF) de la Agencia Tributaria y las Haciendas Forales"),
                                tags$li("Fichero Precensal de Población (FPC), elaborado a partir del padrón y otros registros administrativos"),
                                tags$li("Información de todas las personas residentes en viviendas familiares a 1 de enero del año siguiente al periodo de referencia de los datos de renta")
                            ),
                            
                            tags$h5("¿Qué rentas se incluyen?", class = "mt-4 mb-2"),
                            tags$p("Se consideran todas las rentas percibidas por los residentes, incluyendo:"),
                            tags$ul(
                                tags$li("Rentas del trabajo (salarios, pensiones, prestaciones por desempleo)"),
                                tags$li("Rentas del capital mobiliario (intereses, dividendos)"),
                                tags$li("Rentas por arrendamiento de inmuebles"),
                                tags$li("Rendimientos de actividades económicas"),
                                tags$li("Prestaciones y ayudas públicas"),
                                tags$li("Otras rentas")
                            ),
                            
                            tags$div(
                                class = "help-alert mt-4",
                                tags$p(class = "mb-2", tags$strong("Otros datos:")),
                                tags$ul(
                                    tags$li("Los datos son anónimos y se presentan agregados por zonas geográficas"),
                                    tags$li("Se excluye la población que reside en establecimientos colectivos (e.g. residencias de mayores, cuarteles, prisiones, etc.)"),
                                    tags$li("Los datos se basan en registros administrativos oficiales, no en encuestas"),
                                    tags$li("La cobertura es muy alta: más del 98.6% de la población reside en hogares con algún tipo de renta en el territorio fiscal común (datos de 2016)")
                                )
                            ),

                            tags$div(
                                class = "help-alert mt-4",
                                tags$p(class = "mb-2", tags$strong("El Censo")),
                                tags$p("Para calcular algunas de las estadísticas a nivel municipal disponibles en el panel de resultados, utilizamos datos del Censo Anual de Población del INE. Estos datos son independientes de los datos de renta y se utilizan para calcular indicadores como el porcentaje de población extranjera o los niveles de educación."),
                                tags$p( 
                                    "Puedes consultar más información sobre el Censo ",
                                    tags$a(
                                        href = "https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736176992&menu=resultados&idp=1254735572981#_tabs-1254736195811",
                                        target = "_blank",
                                        "aquí."
                                    )
                                )
                            ),

                            tags$div(
                                class = "help-note mt-4",
                                tags$p(
                                    tags$strong("Nota: "), 
                                    "No todos los indicadores que se muestran en las tarjetas de colores en el panel de resultados están disponibles para todos los municipios. En los casos en los que no haya datos disponibles, se mostrará la media provincial."
                                )
                            )

                        )
                    ),
                    
                    tabPanel("¿Qué ingresos debo incluir?",
                        tags$div(
                            class = "help-content",
                            tags$h4("¿Qué ingresos debo incluir?"),
                            tags$p("Debes sumar todos los ingresos netos mensuales de tu hogar, incluyendo:"),
                            tags$ul(
                                tags$li("Salarios y nóminas"),
                                tags$li("Pensiones de cualquier tipo (jubilación, incapacidad, viudedad...)"),
                                tags$li("Prestaciones por desempleo"),
                                tags$li("Ingresos por alquileres de viviendas o locales"),
                                tags$li("Rendimientos de actividades económicas (autónomos)"),
                                tags$li("Intereses, dividendos y otros rendimientos del capital"),
                                tags$li("Otras ayudas o prestaciones públicas")
                            ),

                            tags$div(
                                class = "help-alert mt-4",
                                tags$p(class = "mb-2", tags$strong("Importante:")),
                                tags$ul(
                                    tags$li("Incluye los ingresos de todos los miembros del hogar"),
                                    tags$li("Los ingresos deben ser netos (después de impuestos y retenciones)"),
                                    tags$li("Si algún ingreso es variable, puedes hacer una media mensual"),
                                    tags$li("Incluye pagas extra prorrateadas si las tienes")
                                )
                            )
                        )

                    ),
                    
                    tabPanel("Hogar",
                        tags$div(
                            class = "help-content",
                            tags$h4("¿Por qué es importante la composición del hogar?"),
                            tags$p("No es lo mismo tener unos ingresos de 2.000€ viviendo solo que mantener una familia de 4 personas con ese mismo ingreso. Por ello, utilizamos una escala de \"equivalencia\" que ajusta los ingresos de la siguiente forma:"),
                            tags$ul(
                                tags$li("Primer adulto: cuenta como 1"),
                                tags$li("Adultos adicionales: cuentan como 0.5 cada uno"),
                                tags$li("Menores de 14 años: cuentan como 0.3 cada uno")
                            ),
                            tags$p("Quizás te preguntes: ¿por qué no simplemente dividimos por el número de personas?"),
                            tags$p("Los hogares tienen lo que llamamos \"economías de escala\": dos personas viviendo juntas no necesitan el doble de recursos que una sola persona. Por ejemplo:"),
                            tags$ul(
                                tags$li("No necesitan doble vivienda"),
                                tags$li("Comparten gastos de luz, agua, internet..."),
                                tags$li("Pueden hacer compras más eficientes")
                            ),
                            tags$p("Por eso usamos esta escala que tiene en cuenta estos ahorros compartidos."),
                        
                            tags$div(
                                class = "help-alert mt-4",
                                tags$p(tags$strong("Ejemplo:")),
                                tags$p("Imaginemos dos hogares con ingresos de 2.000€ mensuales:"),
                                tags$ul(
                                    tags$li(tags$strong("Hogar A:"), " Una persona viviendo sola",
                                        tags$br(),
                                        "Escala: 1",
                                        tags$br(),
                                        "Ingresos equivalentes: 2.000€ ÷ 1 = ", tags$strong("2.000€")
                                    ),
                                    tags$li(tags$strong("Hogar B:"), " Pareja con dos niños menores de 14 años",
                                        tags$br(),
                                        "Escala: 1 + 0.5 + (2 × 0.3) = 2.1",
                                        tags$br(),
                                        "Ingresos equivalentes: 2.000€ ÷ 2.1 = ", tags$strong("952€")
                                    )
                                )
                            )
                        )
                    ),
                    
                    tabPanel("Metodología",
                        tags$div(
                            class = "help-content",
                            tags$h4("¿Cómo calculamos tu posición en la distribución de ingresos?"),
                            
                             tags$p("Para poder decirte dónde te sitúas en la distribución de ingresos de España, necesitamos reconstruir dicha distribución a partir de los datos disponibles. Te explicamos cómo lo hacemos:"),
                            
                            tags$h5("Los datos que tenemos", class = "mt-4 mb-2"),
                            tags$p("Los datos del INE nos proporcionan información agregada por secciones censales (áreas pequeñas que suelen comprender entre 1.000 y 2.500 habitantes). Para cada sección censal, conocemos:"),
                            tags$ul(
                                tags$li("La renta media"),
                                tags$li("El índice de desigualdad (coeficiente de Gini)"),
                                tags$li("El número de habitantes")
                            ),
                            
                            tags$h5("Cómo lo calculamos", class = "mt-4 mb-2"),
                            tags$p("Para reconstruir la distribución completa de ingresos en España:"),
                            tags$ol(
                                tags$li("Primero, para cada barrio:"),
                                tags$ul(
                                    tags$li("Asumimos que los ingresos siguen un patrón \"log-normal\", que es típico en áreas pequeñas donde los vecinos comparten características socioeconómicas similares"),
                                    tags$li("Conociendo la renta media y el índice de desigualdad, la distribución de ingresos log-normal para cada barrio queda completamente determinada")
                                ),
                                tags$li("Después, combinamos las distribuciones de todos los barrios:"),
                                tags$ul(
                                    tags$li("Calculamos una distribución para todo el país, así como para cada provincia y municipio"),
                                    tags$li("Cada barrio \"pesa\" según su población (es decir, barrios con más habitantes influyen más en la distribución final)"),
                                )
                            ),
                            
                            tags$div(
                                class = "help-alert mt-4",
                                tags$p(tags$strong("¿Por qué este método es fiable?")),
                                tags$p("Este método está respaldado por la investigación académica sobre distribución de ingresos, y proporciona una buena aproximación de cómo se determinan los ingresos en zonas geográficas pequeñas."),

                                tags$p("En un mismo barrio, es razonable pensar que los ingresos tienden a seguir una distribución log-normal por dos motivos:"),
                                tags$ul(
                                    tags$li("Los vecinos comparten características similares:"),
                                    tags$ul(
                                        tags$li("Nivel educativo parecido"),
                                        tags$li("Acceso a tipos de empleos similares"),
                                        tags$li("Costes de vida parecidos")
                                    ),
                                    tags$li("Por otro lado,  sabemos que los ingresos de una persona son el resultado de multiplicar varios factores individuales (experiencia, sector laboral, rendimiento individual, etc.)")
                                ),
                                tags$p("Cuando las personas parten de condiciones socioeconómicas parecidas,
                                    estas diferencias multiplicativas tienden a generar naturalmente una distribución log-normal, que es exactamente lo que asumimos en nuestro método. De este modo, respetamos la desigualdad observada dentro de cada sección censal y podemos generar distribuciones realistas mediante un cálculo analítico sencillo."),
                                
                                tags$p(tags$strong("Validación")),
                                tags$p("En la mayoría de las secciones censales, disponemos también de la mediana observada de la distribución de ingresos equivalentes y del ratio entre el percentil 80 y el percentil 20. Para validar nuestro método, hemos comparado estos valores reales con los valores esperados de la distribución log-normal en cada sección censal. Los resultados muestran que los valores obtenidos con nuestro método se ajustan muy bien a los valores reales."),

                                tags$p(tags$strong("Limitaciones")),
                                tags$p("El método que usamos tiende a suavizar los extremos de la distribución, y es probable que subestime los ingresos más altos (lo que llevaría a una estimación conservadora de la desigualdad). Al combinar las distribuciones de miles de barrios, logramos una aproximación razonable a la hora de calcular las posiciones, pero debes interpretarlas como estimaciones."),

                                tags$p(tags$strong("Código abierto")),
                                tags$p(
                                    "Todo el código utilizado para calcular la distribución de ingresos y una nota metodológica completa están disponibles en un repositorio público de GitHub. Si quieres saber más, échale un vistazo ",
                                    tags$a(
                                        href = "https://github.com/pablogguz/compara_tu_ingreso_validation",
                                        target = "_blank",
                                        "aquí."
                                    )
                                )
                            ),
                            
                            tags$div(
                                class = "help-note mt-4",
                                tags$p(
                                    tags$strong("Notas: "), 
                                    tags$ul(
                                        tags$li("Para secciones censales donde el INE no proporciona el índice de Gini (aproximadamente un 5% de los casos), 
                                        se estima mediante técnicas de aprendizaje automático usando variables 
                                        sociodemográficas como predictores."),
                                        tags$li("Los municipios con menos de 3.000 habitantes generalmente tienen sólo una sección censal. Estos municipios con sección censal única representan un 6% de la población a nivel nacional. En estos casos, la distribución municipal coincide con la distribución de la sección censal.")
                                    )
                                )
                            )
                        )
                    ),

                    tabPanel("Gráfica",
                        tags$div(
                            class = "help-content",
                            tags$h4("¿Cómo interpretar la gráfica?"),
                            tags$p("La curva azul muestra cómo se distribuyen los ingresos en la población:"),
                            tags$ul(
                                tags$li("Las zonas más altas indican donde se concentra más gente"),
                                tags$li("Tu posición se marca con una línea vertical en azul oscuro"),
                                tags$li("Tu percepción en la distribución nacional se marcará con una línea vertical en rojo"),
                                tags$li("El percentil indica el porcentaje de hogares que tienen menos ingresos que tú")
                            ),
                            tags$p( "Por ejemplo, si estás en el percentil 70, significa que el 70% de la población tiene ingresos menores que el tuyo.")
                        )
                    ),

                    # tabPanel("Explorador de barrios",
                    #     tags$div(
                    #         class = "help-content",
                    #         tags$h4("¿Qué muestra el mapa?"),
                    #         tags$p("El mapa divide cada municipio en secciones censales (áreas pequeñas que suelen comprender entre 1.000 y 2.500 habitantes) y muestra diferentes indicadores socioeconómicos para cada una. Los indicadores se refieren a las personas que residen en cada sección."),
                            
                    #         tags$h5("Indicadores disponibles", class = "mt-4 mb-2"),
                    #         tags$div(
                    #             class = "table-responsive",
                    #             tags$table(
                    #                 class = "table table-sm",
                    #                 tags$thead(
                    #                     tags$tr(
                    #                         tags$th("Indicador"),
                    #                         tags$th("Descripción"),
                    #                         tags$th("Año"),
                    #                         tags$th("Fuente")
                    #                     )
                    #                 ),
                    #                 tags$tbody(
                    #                     tags$tr(
                    #                         tags$td("Ingreso medio equivalente"),
                    #                         tags$td("Ingreso medio en la sección censal ajustado por tamaño y composición del hogar"),
                    #                         tags$td("2023"),
                    #                         tags$td("Atlas de Distribución de Renta de los Hogares")
                    #                     ),
                    #                     tags$tr(
                    #                         tags$td("Percentil de ingresos (nacional)"),
                    #                         tags$td("Percentil de ingresos a nivel nacional de la sección censal (calculado a partir del ingreso medio equivalente)"),
                    #                         tags$td("2023"),
                    #                         tags$td("Atlas de Distribución de Renta de los Hogares")
                    #                     ),
                    #                     tags$tr(
                    #                         tags$td("Estudios superiores"),
                    #                         tags$td("Porcentaje de población con estudios superiores"),
                    #                         tags$td("2021"),
                    #                         tags$td("Censo")
                    #                     ),
                    #                     tags$tr(
                    #                         tags$td("Población nacida en el extranjero"),
                    #                         tags$td("Porcentaje de residentes nacidos en el extranjero"),
                    #                         tags$td("2021"),
                    #                         tags$td("Censo")
                    #                     )
                    #                     # tags$tr(
                    #                     #     tags$td("Salario bruto medio"),
                    #                     #     tags$td("Salario bruto medio"),
                    #                     #     tags$td("2021"),
                    #                     #     tags$td("Censo y Atlas de Distribución de Renta de los Hogares")
                    #                     # )
                    #                 )
                    #             )
                    #         )

                    #     )
                    # ),

                    tabPanel("Sobre el autor",
                        tags$div(
                            class = "help-content",
                            tags$h4("¡Hola!"),
                            tags$p(
                                "Soy ", tags$strong("Pablo"), " y me dedico a la investigación en economía aplicada. En concreto, trabajo analizando grandes bases de datos administrativas, geoespaciales y encuestas a hogares para entender mejor la sociedad. En mi tiempo libre, me gusta desarrollar proyectos de código abierto y herramientas como esta para hacer los datos más accesibles y útiles para todos."
                            ),

                            tags$p( 
                                "Esta app es un proyecto inspirado en la herramienta ",
                                tags$a(
                                    href = "https://www.compareyourincome.org/",
                                    target = "_blank",
                                    "\"Compare Your Income\" de la OCDE."
                                )
                            ),

                            tags$p( 
                                "Si te interesa saber más sobre mi trabajo, puedes visitar mi página web ",
                                tags$a(
                                    href = "https://pablogguz.github.io",
                                    target = "_blank",
                                    "aquí"
                                ),
                                " o seguirme en ",
                                tags$a(
                                    href = "https://twitter.com/pablogguz_",
                                    target = "_blank",
                                    tags$i(class = "fab fa-x-twitter"), 
                                    " @pablogguz_"
                                ),
                                "."
                            )
                        )
                    )
                ),
                size = "l",
                easyClose = TRUE,
                footer = modalButton("Cerrar")
            )
        )
    })

    observeEvent(input$close_modal, {
        removeModal()
    })

    observeEvent(input$close_modal_map, {
        removeModal()
    })

    # ----------------------------------- Leaflet map -----------------------------------

    # Show modal when tract button clicked
    observeEvent(input$show_tracts, {

        # Determine which municipality to use
        selected_mun <- if (rv$first_modal_open || is.null(rv$last_selected_mun)) {
            rv$first_modal_open <- FALSE
            input$municipio
        } else {
            rv$last_selected_mun
        }
        
        # Show modal with pre-selected municipality
        showModal(tractModalUI(selected_mun, municipality_choices))
    })

    # Update map when municipality changes
    observeEvent(input$modal_municipality, {
        
        req(input$modal_municipality)
        rv$last_selected_mun <- input$modal_municipality
            
        # Store current selection
        rv$last_selected_mun <- input$modal_municipality

        # Get province code
        prov_code <- municipality_lookup[
            municipality_lookup$mun_code == input$modal_municipality, 
        ]$prov_code
        
        # Load stats
        stats <- read.fst(sprintf("data/tract_stats/tracts_%s.fst", prov_code)) %>%
            filter(mun_code == input$modal_municipality) 
            
        # Explicitly set single tract status
        rv$single_tract <- nrow(stats) == 1
        
        if (!rv$single_tract) {
            # Load geometries only if multiple tracts
            tracts <- readRDS(sprintf("data/tract_geoms/tracts_%s.rds", prov_code)) %>%
                filter(mun_code == input$modal_municipality) %>%
                st_transform(4326) %>%
                left_join(stats)
        
            # Update reactive values
            rv$tract_data <- list(
                stats = tracts,
                mun_code = input$modal_municipality
            )
        }
    })

    # Content UI output
    output$tract_content <- renderUI({
        req(input$modal_municipality)
        req(!is.null(rv$single_tract))
        
        if (rv$single_tract) {
            div(
                style = "height: 500px; display: flex; align-items: center; justify-content: center;",
                div(
                    style = "text-align: center; padding: 2rem; background-color: #fff; border-radius: 8px; max-width: 500px;",
                    icon("info-circle", 
                        style = "font-size: 2rem; margin-bottom: 1rem; color: #58a2ec;"),
                    h4("Este municipio sólo tiene una sección censal",
                    style = "margin-bottom: 1rem; color: #2C3E50;"),
                    p("Puedes ver los indicadores en las tarjetas de colores del panel principal.",
                    style = "color: #64748B;")
                )
            )
        } else {
            shinycssloaders::withSpinner(
                leafletOutput("tract_map", height = "500px"),
                type = 2,
                color = "#58a2ec",
                color.background = "white"
            )
        }
    })

    # Update the reactive value for metric
    observeEvent(input$modal_metric, {
        rv$tract_metric <- input$modal_metric
    })

    # Render map
    output$tract_map <- renderLeaflet({
        req(rv$tract_data)
        req(!rv$single_tract)

        # Define the mapping between `rv$tract_metric` and the actual column names
        metric_to_column <- c(
            "income" = "net_income_equiv",
            "percentile" = "national_percentile",
            "education" = "pct_higher_ed_completed",
            "foreign" = "pct_foreign_born"
            #"salary" = "avg_salary"
        )

        selected_column <- metric_to_column[[rv$tract_metric]]

        # Get data 
        map_data <- rv$tract_data$stats %>%
            select(value = all_of(selected_column), tract_code)

        # Get municipality name
        mun_name <- municipality_lookup[
            municipality_lookup$mun_code == input$modal_municipality, 
        ]$mun_name
        
         # Create color palette
        pal <- colorNumeric(
            palette = "RdBu",
            domain = map_data$value,
            reverse = TRUE
        )

        # Define palettes for each metric
        metric_palettes <- list(
            "income" = "RdBu",         
            "percentile" = "RdBu",    
            "education" = "PRGn",    
            "foreign" = "PRGn",     
            "salary" = "RdBu"  
        )

        # Choose palette based on metric
        selected_palette <- metric_palettes[[rv$tract_metric]]

        # Create color palette
        pal <- colorNumeric(
            palette = selected_palette,
            domain = map_data$value,
            reverse = rv$tract_metric == TRUE  # Reverse only for income if needed
        )

        # Create map
        addLegendCustom <- function(map, pal, values, title, position = "bottomright") {
            colors <- pal(seq(min(values, na.rm = TRUE), max(values, na.rm = TRUE), length.out = 5))
            labels <- seq(min(values, na.rm = TRUE), max(values, na.rm = TRUE), length.out = 5)
            labels <- format(round(labels, 1), big.mark = ".", decimal.mark = ",") # Format for readability
            
            legend_html <- paste0(
                "<div style='font-family: Open Sans; font-size: 14px; line-height: 1.5; padding: 6px; background: white; border-radius: 8px; box-shadow: 0 0 6px rgba(0, 0, 0, 0.1);'>",
                "<b>", title, "</b><br>",
                paste0(
                    "<div style='display: flex; align-items: center;'>",
                    "<span style='width: 12px; height: 12px; background: ", colors, "; display: inline-block; margin-right: 8px;'></span>",
                    "<span>", labels, "</span>",
                    "</div>",
                    collapse = ""
                ),
                "</div>"
            )
            
            map %>% addControl(html = legend_html, position = position)
        }

        legend_title <- switch(
            rv$tract_metric,
            "income" = "Ingreso medio equivalente (€)",
            "percentile" = "Percentil de ingresos (nacional)",
            "education" = "Población de 15 y más años con estudios superiores (%)",
            "foreign" = "Población nacida en el extranjero (%)"
            #"salary" = "Salario bruto medio (€)"
        )

        # Check if municipality has only one tract
            map_data <- map_data %>%
                rowwise() %>%  
                mutate(
                    tooltip = paste0(
                        "<b>Sección:</b> ", tract_code, "<br>",
                        "<b>", switch(rv$tract_metric,
                            "income" = "Ingreso medio equivalente",
                            "percentile" = "Percentil de ingresos (nacional)",
                            "education" = "Población de 15 y más años con estudios superiores",
                            "foreign" = "Población nacida en el extranjero"
                            #"salary" = "Salario bruto medio"
                        ), ":</b> ",
                        if (rv$tract_metric %in% c("income", "salary")) {
                            paste0(format(round(value), big.mark = ".", decimal.mark = ","), " €")
                        } else if (rv$tract_metric %in% c("education", "foreign")) {
                            paste0(format(round(value, 1), big.mark = ".", decimal.mark = ","), "%")
                        } else {
                            format(floor(value), big.mark = ".", decimal.mark = ",")
                        }
                    )
                ) %>%
                mutate(
                    tooltip = ifelse(
                        is.na(value),
                        paste0(
                            "<b>Sección:</b> ", tract_code, "<br>",
                            "<b>", switch(rv$tract_metric,
                                "income" = "Ingreso medio equivalente",
                                "percentile" = "Percentil de ingresos (nacional)",
                                "education" = "Población de 15 y más años con estudios superiores",
                                "foreign" = "Población nacida en el extranjero"
                                #"salary" = "Salario bruto medio"
                            ), ":</b> Sin datos"
                        ),
                        tooltip
                    )
                ) %>%
                ungroup() 
                
            # Leaflet code
            leaflet(map_data) %>%
                addProviderTiles("CartoDB.Positron", # Light, clean basemap
                    options = providerTileOptions(
                        updateWhenZooming = FALSE, # Prevent tile flickering
                        updateWhenIdle = TRUE
                    )
                ) %>%
                addPolygons(
                    fillColor = ~pal(value),
                    weight = 0.5,
                    opacity = 1,
                    color = "#FFFFFF",
                    fillOpacity = 0.7, 
                    label = ~lapply(tooltip, HTML),
                    labelOptions = labelOptions(
                        style = list(
                            "font-family" = "Open Sans",
                            "font-size" = "12px",
                            "border-radius" = "4px",
                            "padding" = "6px",
                            "background-color" = "white",
                            "box-shadow" = "0 0 6px rgba(0,0,0,0.2)"
                        ),
                        direction = "auto", # Dynamically position tooltips
                        textsize = "15px",
                        opacity = 1,
                        html = TRUE # Ensure HTML rendering for tooltips
                    ),
                    highlightOptions = highlightOptions(
                        weight = 3,            # Highlighted polygon border
                        fillOpacity = 0.9,     # Increased fill opacity
                        bringToFront = TRUE    # Ensure hover polygon is on top
                    )
                ) %>%
                addLegendCustom(
                    pal = pal,
                    values = map_data$value,
                    title = legend_title
                )

    })
}
