# the libraries, map_data, and map_icons are both in server and ui. Not sure if necessary
library(shiny)
library(shinyjs)
library(dplyr)
library(leaflet)
library(fontawesome)
library(stringr)
library(shinyWidgets)
library(RColorBrewer)
library(BAMMtools)

# data generated from parking_reform.R
map_data <- read.csv(file = "tidied_map_data.csv", stringsAsFactors = F)

# Make a list of icons based on magnitude, land use, and icon
map_icons <- awesomeIconList(test = makeAwesomeIcon(text = fa('car')))
for(mag in unique(map_data$magnitude_encoded)){
    for(lu in unique(map_data$land_use_encoded)) {
        for(pop in unique(map_data$population_encoded)) {
            for(spec in unique(map_data$is_special)) {
                map_icons[paste("icon", mag, lu, pop, spec, sep = "_")] <- 
                    awesomeIconList(makeAwesomeIcon(text = fa(lu, fill = pop), 
                                                    markerColor = mag,
                                                    #iconColor = pop, 
                                                    #squareMarker = T,
                                                    # extraClasses = spec
                                                    ))
            }
        }
    }
}

# Define UI and front end
bootstrapPage(
    # use shiny js to be able to show and hide more detail pane
    useShinyjs(),
    
    # load up css
    tags$head(
        tags$link(rel = "stylesheet",
                  type = "text/css",
                  href = "map_stylings.css"),
        tags$script(src = "https://kit.fontawesome.com/37a140b4a8.js",
                    crossorigin="anonymous"),
        tags$script(src = "add_highlights.js")
    ),
    
    
    # generate map and selectors
    fluidRow(
        column(
            id = "mapView",
            width = 12,
            leafletOutput("map", ),
            # absolutePanel(id = "controls", class = "panel panel-default",
            #               bottom = -13,
            #               left = 5,
            #               tags$div(class = "my-legend",
            #                        tags$div(class = "legend-scale",
            #                                 tags$ul(class = "legend-labels",
            #                                         tags$li(tags$span(style = "background:blue;"),
            #                                                 "Citywide"),
            #                                         tags$li(tags$span(style = "background:green;"),
            #                                                 "Transit Oriented"),
            #                                         tags$li(tags$span(style = "background:orange;"),
            #                                                 "City Center"),
            #                                         tags$li(tags$span(style = "background:purple;"),
            #                                                 "Main Street")))
            #               )
            # ),
            # absolutePanel(
            #     id = "controls", 
            #     class = "panel panel-default",
            #     draggable = FALSE,
            #     bottom = 90,
            #     left = 5,
            #     tags$div(
            #         class = "icon-legend",
            #         list(HTML(HTML("<p>"),
            #                   fa("city"), 
            #                   HTML(" - All Land Uses</p>")
            #         ),
            #         HTML(HTML("<p>"),
            #              fa("building"),
            #              HTML(" - Commercial</p>")
            #         ),
            #         HTML(HTML("<p>"),
            #              fa("home"),
            #              HTML(" - Residential</p>")
            #         ),
            #         HTML(HTML("<p>"),
            #              fa("laptop"),
            #              HTML(" - Mixed Use</p>")
            #         ))
            #     )
            #     
            # ),
            absolutePanel(
                top = 10,
                left = 50,
                draggable = FALSE,
                width = "100%",
                dropdown(
                    sliderInput("radsize",
                                "Circle Radius",
                                min = 0,
                                max = 20,
                                value = 7.5,
                                step = 0.5),
                    sliderInput("opac",
                                "Opacity",
                                min = 0,
                                max = 1,
                                value = 0.7,
                                step = 0.05),
                    selectInput("colors", "Color Scheme",
                                rownames(subset(brewer.pal.info, category %in% c("seq", "div")))),
                    pickerInput("magnitude_selector",
                                tags$b("Targeted Area"),
                                choices = c("Citywide", "City Center", "Transit Oriented", "Main Street"),
                                options = pickerOptions(actionsBox = TRUE),
                                multiple = T,
                                selected = c("Citywide", "City Center", "Transit Oriented", "Main Street")
                    ),
                    pickerInput("status_selector",
                                tags$b("Implementation Stage"),
                                choices = c("Implemented", "Passed", "Planned", "Proposed","Repealed"),
                                selected = c("Implemented", "Passed", "Planned", "Proposed"),
                                options = pickerOptions(actionsBox = TRUE),
                                multiple = T
                    ),
                    pickerInput("type_selector",
                                tags$b("Policy Change"),
                                choices = c("Reduce Parking Minimums", "Eliminate Parking Minimums", "Parking Maximums"),
                                selected = c("Reduce Parking Minimums", "Eliminate Parking Minimums", "Parking Maximums"),
                                options = pickerOptions(actionsBox = TRUE),
                                multiple = T
                    ),
                    pickerInput("land_use_selector",
                                tags$b("Affected Land Use"),
                                choices = c("All Uses", "Commercial", "Residential"),
                                selected = c("All Uses", "Commercial", "Residential"),
                                options = pickerOptions(actionsBox = TRUE,
                                noneSelectedText = "nothingselected"
                                ),
                                multiple = T
                    ),
                    sliderTextInput(
                        inputId = "poprange",
                        label = "Population:",
                        choices = getJenksBreaks(map_data$population, 20)[c(1:10, 15, 20)],
                        selected = range(map_data$population),
                        grid = TRUE
                    ),
                    circle = TRUE,
                    status = "danger",
                    icon = icon("gear"),
                    width = "300px"
                          )
                ),
                
            # add in logos
            withTags({
                div(id = "logos",
                    column(1,
                           fluidRow(tags$a(img(src = "assets/st_logo.png", align = "right"), href = "https://www.strongtowns.org/", id = "strong_towns_link", target = "_blank")),
                           fluidRow(tags$a(img(src = "assets/prn_logo.jpeg", align = "right"), href = "https://parkingreform.org/", id = "parking_reform_link", target = "_blank"))
                    )
                )
            }),
            # create more detail pane but leave it hidden
            hidden(
                withTags({
                    div(id = "city_detail_info",
                        fluidRow(class="clicked_city_first_row",
                                 column(style='padding:0px;', 11, h4(uiOutput("clicked_city"))),
                                 column(1, actionButton("close_detail", "x"))
                        ),                        
                        uiOutput("clicked_city_state"),
                        textOutput("clicked_population"),
                        textOutput("clicked_report_summary"),
                        textOutput("clicked_report_magnitude"),
                        textOutput("clicked_land_uses"),
                    )
                })
            )
        )
    )        
)

