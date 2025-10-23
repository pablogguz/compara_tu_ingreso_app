ui <- bs4DashPage(
    title = "Compara tu ingreso",
    dark = NULL,
    help = NULL,
    header = dashboardHeader(
        title = "",
        disable = TRUE
    ),
    sidebar = dashboardSidebar(
        disable = TRUE
    ),
    body = dashboardBody(
        useShinyjs(),
        tags$head(
            tags$link(rel = "stylesheet", type = "text/css", href = "styles.css"),
            tags$link(rel = "stylesheet", type = "text/css", href = "styles_results.css"),
            tags$link(rel = "stylesheet", href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"),

            # Cookie consent initialization
            tags$script(HTML("
                function initGA() {
                    if (localStorage.getItem('cookieConsent') === 'accepted') {
                        var script = document.createElement('script');
                        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-Y8KGPP8Z00';
                        script.async = true;
                        document.head.appendChild(script);
                        
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-Y8KGPP8Z00');
                    }
                }

                function acceptCookies() {
                    localStorage.setItem('cookieConsent', 'accepted');
                    document.getElementById('cookieConsent').style.display = 'none';
                    // Send consent status to Shiny
                    Shiny.setInputValue('cookieConsent', 'accepted');
                    initGA();
                }

                function rejectCookies() {
                    localStorage.setItem('cookieConsent', 'rejected');
                    document.getElementById('cookieConsent').style.display = 'none';
                    // Send consent status to Shiny
                    Shiny.setInputValue('cookieConsent', 'rejected');
                }

                // Check cookie consent status on page load
                document.addEventListener('DOMContentLoaded', function() {
                    var consent = localStorage.getItem('cookieConsent');
                    if (consent === null) {
                        document.getElementById('cookieConsent').style.display = 'block';
                    } else {
                        // Send stored consent status to Shiny
                        Shiny.setInputValue('cookieConsent', consent);
                        if (consent === 'accepted') {
                            initGA();
                        }
                    }
                });
            ")),

            # Cookie consent banner styles
            tags$style(HTML("
                #cookieConsent {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    background: white;
                    padding: 1rem;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                    z-index: 1000;
                    font-family: 'Open Sans', sans-serif;
                }

                .cookie-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                }

                .cookie-text {
                    flex: 1;
                    font-size: 0.9rem;
                    color: #4a5568;
                }

                .cookie-buttons {
                    display: flex;
                    gap: 0.5rem;
                }

                .cookie-btn {
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    border: none;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .accept-cookies {
                    background: #58a2ec;
                    color: white;
                }

                .reject-cookies {
                    background: #e2e8f0;
                    color: #4a5568;
                }
            ")),

            # General meta tags
            tags$meta(name = "description", content = "Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF"),
            tags$meta(name = "keywords", content = "ingresos, distribución de ingresos, comparación de ingresos, España, IRPF, renta per cápita, salario medio, nivel de vida, comparador salarial, calculadora de ingresos, renta disponible, estadísticas de renta, desigualdad económica, percentiles de ingresos, Atlas de Distribución de Renta, INE, comparativa salarial, sueldo medio, ingresos familiares, ingresos por hogar"),
            tags$meta(name = "author", content = "Pablo García Guzmán, Pablo Garcia Guzman, pablogguz"),
            
            # Meta tags for Twitter Card
            tags$meta(name = "twitter:card", content = "summary_large_image"),
            tags$meta(name = "twitter:site", content = "@pablogguz_"),
            tags$meta(name = "twitter:title", content = "Compara tu ingreso"),
            tags$meta(name = "twitter:description", content = "Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF"),
            tags$meta(name = "twitter:image", content = "https://www.comparatuingreso.es/card_teaser.png?v1"),
            
            # Open Graph meta tags
            tags$meta(property = "og:title", content = "Compara tu ingreso"),
            tags$meta(property = "og:description", content = "Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF"),
            tags$meta(property = "og:image", content = "https://www.comparatuingreso.es/card_teaser.png?v1"),
            tags$meta(property = "og:url", content = "https://comparatuingreso.es"),
            tags$meta(property = "og:type", content = "website"),
            
            # Include the distribution icon for the navbar
            tags$link(rel = "icon", type = "image/svg+xml", href = "distribution-icon.svg"),
            
            # privacy modal
            tags$script(HTML("
                function showPrivacyModal() {
                    $('#privacyModal').modal('show');
                }
            ")),

            tags$script(HTML("
                $(document).ready(function() {
                    // Initial setup
                    $('#main-form').hide();
                    
                    // Landing page animations
                    setTimeout(function() {
                        $('.landing-title').addClass('visible');
                        $('.distribution-curve').addClass('visible');
                    }, 100);
                    setTimeout(function() {
                        $('.landing-subtitle').addClass('visible');
                    }, 500);
                    setTimeout(function() {
                        $('.start-button').addClass('visible');
                    }, 1000);
                    
                    // Start button click handler
                    $('.start-button').click(function() {
                        $('.landing-page').fadeOut(500, function() {
                            $('#main-form').fadeIn(500);
                        });
                    });

                    // Enable/disable next buttons based on input
                    $('#municipio').on('change', function() {
                        $('#next1').prop('disabled', !$(this).val());
                    });

                    $('#ingresos_netos').on('input', function() {
                        var value = $(this).val();
                        var isValid = value !== '' && !isNaN(value) && value > 0 && value <= 50000;
                        $('#next2').prop('disabled', !isValid);
                    });

                    // Navigation buttons
                    $('.next-btn').click(function() {
                        var currentStep = $(this).closest('.question-step');
                        var nextStep = currentStep.next('.question-step');
                        currentStep.hide();
                        nextStep.show();
                        updateProgress(nextStep.data('step'));
                    });
                    
                    $('.prev-btn').click(function() {
                        var currentStep = $(this).closest('.question-step');
                        var prevStep = currentStep.prev('.question-step');
                        currentStep.hide();
                        prevStep.show();
                        updateProgress(prevStep.data('step'));
                    });

                   // Calculate button click handler - transition to results
                    $(document).on('click', '#calcular', function() {
                        $('#main-form').fadeOut(300, function() {
                            setTimeout(function() {
                                $('.results-box').addClass('visible');
                            }, 100);
                        });
                    });

                    // Real-time income validation
                    $('#ingresos_netos').on('input', function() {
                        var value = $(this).val();
                        var isValid = value !== '' && !isNaN(value) && value > 0 && value <= 50000;
                        
                        if (isValid) {
                            $(this).removeClass('is-invalid').addClass('is-valid');
                            $('#income-error').fadeOut();
                        } else {
                            $(this).removeClass('is-valid').addClass('is-invalid');
                            $('#income-error').fadeIn();
                        }
                        
                        $('#next2').prop('disabled', !isValid);
                    });

                    function updateProgress(step) {
                        $('.step-indicator').removeClass('active');
                        $('.step-indicator:lt(' + step + ')').addClass('active');
                        $('.progress-bar-fill').css('width', ((step - 1) / 3 * 100) + '%');
                    }

                    $(document).click(function(e) {
                        if (!$(e.target).closest('.neighborhood-dropdown, #show_neighborhood').length) {
                            $('#neighborhood_search').hide();
                        }
                    });

                    $('.neighborhood-dropdown').click(function(e) {
                        e.stopPropagation();
                    });
                });
            "))
        ),
        
        # Cookie consent banner
        tags$div(
            id = "cookieConsent",
            div(
                class = "cookie-content",
                div(
                    class = "cookie-text",
                    "Utilizamos cookies para entender cómo utilizan los usuarios nuestra web y mejorar tu experiencia, y guardamos las respuestas de forma anónima con fines de investigación académica. ",
                    tags$span(
                        class = "info-toggle",
                        onclick = "showPrivacyModal()",
                        style = "cursor: pointer; color: #58a2ec;",
                        "Más información."
                    )
                ),
                div(
                    class = "cookie-buttons",
                    tags$button(
                        onclick = "acceptCookies()",
                        class = "cookie-btn accept-cookies",
                        "Aceptar"
                    ),
                    tags$button(
                        onclick = "rejectCookies()",
                        class = "cookie-btn reject-cookies",
                        "Rechazar"
                    )
                )
            )
        ),

        # Privacy modal
        tags$div(
            id = "privacyModal",
            class = "modal fade",
            tabindex = "-1",
            role = "dialog",
            tags$div(
                class = "modal-dialog",
                tags$div(
                    class = "modal-content",
                    tags$div(
                        class = "modal-header",
                        tags$h5(class = "modal-title", "Información sobre privacidad"),
                        tags$button(
                            type = "button",
                            class = "close",
                            `data-dismiss` = "modal",
                            tags$span("×")
                        )
                    ),
                    tags$div(
                        class = "modal-body",
                        tags$p(
                            tags$strong("¿Qué datos recogemos?"),
                            tags$br(),
                            "1. Datos de uso: páginas visitadas y tiempo de permanencia en la web.",
                            tags$br(),
                            "2. Respuestas anónimas: municipio, composición del hogar, ingresos y percepción."
                        ),
                        tags$p(
                            tags$strong("¿Para qué los usamos?"),
                            tags$br(),
                            "1. Para entender cómo se utiliza la web y mejorar la experiencia del usuario.",
                            tags$br(),
                            "2. Para investigación académica sobre la percepción de la desigualdad en España."
                        ),
                        tags$p(
                            tags$strong("Tus derechos"),
                            tags$br(),
                            "Puedes rechazar el uso de cookies y la recopilación de datos en cualquier momento. La web funcionará igualmente si decides no aceptar."
                        )
                    )
                )
            )
        ),

        # Landing Page (same as before)
        div(class = "landing-page",
            div(class = "distribution-curve",
                tags$svg(xmlns="http://www.w3.org/2000/svg", viewBox="0 0 800 200",
                    tags$path(d="M0,150 Q200,150 300,50 Q400,-50 500,50 Q600,150 800,150", 
                             fill="none", 
                             stroke="#58a2ec", 
                             class="curve-path")
                )
            ),
            h1(class = "landing-title",
               "Descubre tu posición en la distribución de ingresos"
            ),
            p(class = "landing-subtitle",
              "Compara tus ingresos con los del resto de hogares en España utilizando datos administrativos de declaraciones de IRPF"
            ),
            actionButton("start", "Comenzar", class = "start-button")
        ),
        
        # Sequential Form
        div(id = "main-form",
            div(class = "container-fluid",
                # Progress indicators (same as before)
                div(class = "progress-container",
                    div(class = "progress-bar-wrapper",
                        div(class = "progress-bar-fill")
                    ),
                    div(class = "step-indicators",
                        div(class = "step-indicator active", "1"),
                        div(class = "step-indicator", "2"),
                        div(class = "step-indicator", "3"),
                        div(class = "step-indicator", "4")
                    )
                ),
                
                # Questions with centered content
                div(class = "question-step", id = "step1", `data-step`="1",
                    div(class = "question-content-wrapper",
                        div(class = "question-icon", icon("map-marker-alt")),
                        h2(class = "question-title", "¿Dónde vives?"),
                        p(class = "question-subtitle", "Selecciona tu municipio de residencia"),
                        div(class = "question-content",
                            div(class = "input-centered",
                                selectizeInput("municipio",
                                    label = NULL,
                                    selected = "Aranjuez (Madrid)",
                                    choices = NULL,
                                      options = list(
                                        placeholder = "Escribe tu municipio…",
                                        maxOptions = 200
                                    )
                                )
                            )
                        ),
                        div(class = "button-wrapper",
                            actionButton("next1", "Siguiente", 
                                class = "btn-nav next-btn", 
                                disabled = TRUE)
                        )
                    )
                ),
                
                div(class = "question-step", id = "step2", `data-step`="2", style = "display: none;",
                    div(class = "question-content-wrapper",
                        div(class = "question-icon", icon("euro-sign")),
                        h2(class = "question-title", 
                        HTML("¿Cuáles fueron los ingresos netos <span style='color: #58a2ec;'>mensuales</span> de tu hogar en 2023?")),
                        p(class = "question-subtitle", 
                        HTML("Introduce los ingresos netos <span style='color: #58a2ec; font-weight: 600;'>mensuales</span> de tu hogar en 2023. Ten en cuenta todos los ingresos (salarios, pensiones, prestaciones, etc.)")),
                        div(class = "question-content",
                            div(class = "input-centered",                                                            
                                numericInput("ingresos_netos",
                                    label = NULL,
                                    value = NA,
                                    min = 0,
                                    max = 50000
                                )
                            )
                        ),
                        div(
                            id = "income-error", 
                            class = "error-message", 
                            style = "display: none;",
                            "Por favor, introduce un valor entre 0 y 50.000 €"
                        ),
                        div(class = "button-wrapper",
                            actionButton("prev2", "Anterior", class = "btn-nav prev-btn"),
                            actionButton("next2", "Siguiente", class = "btn-nav next-btn", disabled = TRUE)
                        )
                    )
                ),
                
                div(class = "question-step", id = "step3", `data-step`="3", style = "display: none;",
                    div(class = "question-content-wrapper",
                        div(class = "question-icon", icon("users")),
                        h2(class = "question-title", "¿Cómo es tu hogar?"),
                        p(class = "question-subtitle", "Composición de tu unidad familiar"),
                        div(class = "question-content",
                            div(class = "household-inputs",
                                div(class = "input-group",
                                    selectizeInput("adultos",
                                        "Mayores de 14 años",
                                        choices = 1:20,
                                        selected = 1
                                    )
                                ),
                                div(class = "input-group",
                                    selectizeInput("menores",
                                        "Menores de 14 años",
                                        choices = 0:20,
                                        selected = 0
                                    )
                                )
                            )
                        ),
                        div(class = "button-wrapper",
                            actionButton("prev3", "Anterior", class = "btn-nav prev-btn"),
                            actionButton("next3", "Siguiente", class = "btn-nav next-btn")
                        )
                    )
                ),
                
                div(class = "question-step", id = "step4", `data-step`="4", style = "display: none;",
                    div(class = "question-content-wrapper",
                        div(class = "question-icon", icon("bullseye")),
                        h2(class = "question-title", "¿Dónde crees que te sitúas?"),
                        p(class = "question-subtitle", "Tu percepción en la distribución de ingresos a nivel nacional"),
                        div(class = "question-content",
                            div(class = "input-centered-perception",
                                sliderInput("percepcion",
                                    label = div(
                                        class = "slider-labels",
                                        div(class = "label-left", "Más pobre"), 
                                        div(class = "label-right", "Más rico")
                                    ),  
                                    min = 1,
                                    max = 99,
                                    value = 50,
                                    step = 1,
                                    width = "100%"
                                ),
                                p(class = "help-text", 
                                  "1 representa el 1% de hogares con menos ingresos y 99 el 1% con más ingresos")
                            )
                        ),
                        div(class = "button-wrapper",
                            actionButton("prev4", "Anterior", class = "btn-nav prev-btn"),
                            actionButton("calcular", 
                                "Calcular", 
                                class = "btn-nav calculate-btn"
                            )
                        )
                    )
                )
            )
        ),
        # Results section
        uiOutput("resultados"),

        # Add the help button
        actionButton("show_help", "", 
            icon = icon("question-circle"), 
            class = "help-btn"
        )
    ),
    footer = dashboardFooter(
        fixed = FALSE,
        left = "Hecho con ❤️ por Pablo García Guzmán.",
        right = format(Sys.Date(), "%Y")
    )
)