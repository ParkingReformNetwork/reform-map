# the libraries, map_data, and map_icons are both in server and ui. Not sure if necessary
library(shiny)
library(shinyjs)
library(dplyr)
library(leaflet)
library(fontawesome)
library(stringr)

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
                                                    extraClasses = spec))
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
            id="sidePanel",
            width = 3,
            div(id = "selector_pane",
                selectInput(
                    "city_selector", 
                    h4("City Selector"), 
                    map_data$city,
                    multiple = TRUE
                ),
                checkboxGroupInput("verified_selector",
                                   h4("Verified Selector"),
                                   choices = c(1, 0),
                                   selected = c(1, 0)),
                checkboxGroupInput("magnitude_selector",
                                   h4("Magnitude Selector"),
                                   choiceNames = list(HTML("<p style='color: blue; font-weight: bold;'>  Citywide</p>"),
                                                      HTML("<p style='color: orange; font-weight: bold;'>  City Center</p>"),
                                                      HTML("<p style='color: green; font-weight: bold;'>  Transit Oriented</p>"),
                                                      HTML("<p style='color: purple; font-weight: bold;'>  Main Street</p>")
                                   ),
                                   choiceValues = c("Citywide", "City Center", "Transit Oriented", "Main Street"),
                                   selected = c("Citywide", "City Center", "Transit Oriented", "Main Street")),
                checkboxGroupInput("status_selector",
                                   h4("Policy Selector"),
                                   choices = unique(map_data$report_status),
                                   selected = unique(map_data$report_status)),
                checkboxGroupInput("type_selector",
                                   h4("Report Type Selector"),
                                   choices = c("Reduce Parking Minimums", "Eliminate Parking Minimums", "Parking Maximums"),
                                   selected = c("Reduce Parking Minimums", "Eliminate Parking Minimums", "Parking Maximums")),
                checkboxGroupInput("land_use_selector",
                                   h4("Land Use Selector"),
                                   choiceNames = list(HTML(HTML("<p>"),
                                                            fa("city"), 
                                                            HTML(" - All Land Uses</p>")
                                                            ),
                                                   HTML(HTML("<p>"),
                                                            fa("building"),
                                                            HTML(" - Commercial</p>")
                                                            ),
                                                   HTML(HTML("<p>"),
                                                            fa("home"),
                                                            HTML(" - Residential</p>")
                                                   ),
                                                   HTML(HTML("<p>"),
                                                            fa("car"),
                                                            HTML(" - Medical</p>")
                                                   ),
                                                   HTML(HTML("<p>"),
                                                            fa("car"),
                                                            HTML(" - Industrial</p>")
                                                   )),
                                   choiceValues = c( "All Uses", "Commercial", "Residential", "Medical", "Industrial"),
                                   selected = c("All Uses", "Commercial", "Residential", "Medical", "Industrial")),
            )
        ),
        column(
            id = "mapView",
            width = 9,
            leafletOutput("map", ),
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
                                 column(11, h4(textOutput("clicked_city"))),
                                 column(1, actionButton("close_detail", "x"))
                        ),
                        textOutput("clicked_population"),
                        textOutput("clicked_report_summary"),
                        textOutput("clicked_report_magnitude"),
                        textOutput("clicked_land_uses"),
                        textOutput("clicked_reporter"),
                        uiOutput("clicked_city_state")
                    )
                })
            )
        )
    )        
)
