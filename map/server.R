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
                                          # extraClasses = spec
          ))
      }
    }
  }
}


# set up back end
function(input, output, session) {
  
  # initial map create
  output$map <- renderLeaflet({
    leaflet() %>%
      addProviderTiles(providers$Stamen.TonerLite,
                       options = providerTileOptions(noWrap = FALSE)
      ) %>%
      setView(
        lng = -96.7449732,
        lat = 43.2796758,
        zoom = 4
      )
  })
  
  # create data subset based on user input
  filtered_d <- reactive({
    input_citywide <- any(input$magnitude_selector %in% "Citywide")
    input_citycenter <- any(input$magnitude_selector %in% "City Center")
    input_transit <- any(input$magnitude_selector %in% "Transit Oriented")
    input_mainstreet <- any(input$magnitude_selector %in% "Main Street")
    
    input_residential <- any(input$land_use_selector %in% "Residential")
    input_commercial <- any(input$land_use_selector %in% "Commercial")
    input_alluses <- any(input$land_use_selector %in% "All Uses")
    
    input_reduce <- any(input$type_selector %in% "Reduce Parking Minimums")
    input_eliminate <- any(input$type_selector %in% "Eliminate Parking Minimums")
    input_maximums <- any(input$type_selector %in% "Parking Maximums")
    map_data %>%
      filter((is_uses_residential & input_residential) | (is_uses_commercial & input_commercial) | (is_uses_alluses & input_alluses)) %>%
      filter((is_magnitude_citycenter & input_citycenter)| (is_magnitude_citywide & input_citywide) | (is_magnitude_transit & input_transit)| (is_magnitude_mainstreet & input_mainstreet)) %>%
      filter((is_type_eliminated & input_eliminate) | (is_type_reduced & input_reduce)| (is_type_maximums & input_maximums)) %>%
      filter(if(is.null(input$status_selector)){is.na(report_status)} 
             else {is.na(report_status) | grepl(tolower(paste(input$status_selector, collapse = "|")), report_status, ignore.case=TRUE)}) %>%
      filter(population >= input$poprange[1] & population <= input$poprange[2])
  })
  
  filtered_data <- filtered_d %>% debounce(550)
  
  # display city and state for clicked map point. will end up in more detail pane
  output$clicked_city <- renderUI({
    req(input$map_marker_click$id)
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      select(city, state) %>%
      paste0(collapse = ", ") -> city_label
    
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      mutate(city_state = str_replace_all(paste(city, state, sep="_"), " ", "")) %>%
      select(city_state) %>%
      paste0() %>%
      paste("https://map.parkingreform.org/minimums/detail/", .,".html", sep="") -> url
    HTML(paste(a(city_label, href=url, target="_blank")))
  }
  )
  
  # display population for clicked city
  output$clicked_population <- renderText({
    req(input$map_marker_click$id)
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      mutate(population = paste("Population:", format(population, big.mark = ","))) %>%
      select(population) %>%
      paste0()
  }
  )
  
  # display report magnitude for clicked city
  output$clicked_report_magnitude <- renderText({
    req(input$map_marker_click$id)
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      mutate(report_magnitude = paste("Report Magnitude:", report_magnitude)) %>%
      select(report_magnitude) %>%
      paste0()
  }
  )
  
  # display report data for clicked map point
  output$clicked_report_summary <- renderText({
    req(input$map_marker_click$id)
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      select(report_summary) %>%
      paste0()
  }
  )
  
  # display report data for clicked map point
  output$clicked_land_uses <- renderText({
    req(input$map_marker_click$id)
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      mutate(land_uses = paste("Land Uses:", land_uses)) %>%
      select(land_uses) %>%
      paste0()
  }
  )
  
  # render city_state for citation link
  output$clicked_city_state <- renderUI({
    req(input$map_marker_click$id)
    
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      mutate(city_state = str_replace_all(paste(city, state, sep="_"), " ", "")) %>%
      select(city_state) %>%
      paste0() %>%
      paste("https://map.parkingreform.org/parking_map/city_detail/", .,".html", sep="") -> url
    HTML(paste(a("Detailed Information and Citations", href=url, target="_blank")))
  }
  )
  
  
  # hide more detail pane when the close_detail action button is clicked
  observeEvent(input$close_detail, {
    hide(id = "city_detail_info",
         anim = T,
         animType = "fade",
         time = 0.5)
  })
  
  # show the more detail pane when a city is clicked on the map
  observeEvent(input$map_marker_click, {
    show(id = "city_detail_info",
         anim = T,
         animType = "fade",
         time = 0.5)
  })
  
  
  # changes to map based on selection
  observe({
    if(nrow(filtered_data()) == 0) {
      map_points <- filtered_data()
      
      map_points %>%
        mutate(all_encoded = paste("icon",
                                   magnitude_encoded,
                                   land_use_encoded,
                                   population_encoded,
                                   is_special,
                                   sep = "_"
        )) %>%
        leafletProxy("map", data = .) %>%
      
        clearMarkers()
    }
    
    else {
      map_points <- filtered_data()
      
      map_points %>%
        mutate(all_encoded = paste("icon",
                                   magnitude_encoded,
                                   land_use_encoded,
                                   population_encoded,
                                   is_special,
                                   sep = "_"
        )) %>%
        leafletProxy("map", data = .) %>%
        clearMarkers() %>%
        addAwesomeMarkers(lng = ~map_points$long,
                          lat = ~map_points$lat,
                          layerId = ~map_points$id,
                          icon = ~map_icons[all_encoded],
                          label = ~ paste(map_points$city, map_points$state, sep = ", "),
                          options = markerOptions(zIndexOffset = map_points$population)
                          #options = markerOptions(opacity = map_points$population_encoded)
                          #clusterOptions = markerClusterOptions()
                          #popup = map_points$popup_info tooltip, ignoring for now
        )
      session$sendCustomMessage("map_markers_added", message)
    }
  })
}

