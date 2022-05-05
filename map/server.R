# the libraries, map_data, and map_icons are both in server and ui. Not sure if necessary
library(shiny)
library(shinyjs)
library(dplyr)
library(leaflet)
library(fontawesome)
library(stringr)

# data generated from parking_reform.R
map_data <- read.csv(file = "tidied_map_data.csv", stringsAsFactors = F)

# population slider to numeric
population_slider_to_numeric <- function(slider_value) {
  slider_numeric <- case_when(
    slider_value == "100"  ~ 100,
    slider_value == "500"  ~ 500,
    slider_value == "1K"   ~ 1000,
    slider_value == "5K"   ~ 5000,
    slider_value == "10K"  ~ 10000,
    slider_value == "50K"  ~ 50000,
    slider_value == "100K" ~ 100000,
    slider_value == "500K" ~ 500000,
    slider_value == "1M"   ~ 1000000,
    slider_value == "5M"   ~ 5000000,
    slider_value == "10M"  ~ 10000000,
    slider_value == "50M"  ~ 50000000
  )
  return(slider_numeric)
}


# set up back end
function(input, output, session) {
  highlights <- reactiveValues(mandates = c(0,1))
  sessionVars <- reactiveValues(notifyMandate = TRUE)
  
  # create data subset based on user input
  filtered_d <- reactive({
    input_regional <- any(input$magnitude_selector %in% "Regional")
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
    if(isTRUE(input$no_mandate_city_selector)) {
      map_data %>%
        filter(is_no_mandate_city %in% highlights$mandates)
    } else if (!is.null(input$city_selector)) {
      map_data %>%
       filter((city_search %in% input$city_selector) | is.null(input$city_selector ))
    } else {
    map_data %>%
      filter((is_uses_residential & input_residential) | (is_uses_commercial & input_commercial) | (is_uses_alluses & input_alluses)) %>%
      filter((is_magnitude_citycenter & input_citycenter)| (is_magnitude_regional & input_regional) | (is_magnitude_citywide & input_citywide) | (is_magnitude_transit & input_transit)| (is_magnitude_mainstreet & input_mainstreet)) %>%
      filter((is_type_eliminated & input_eliminate) | (is_type_reduced & input_reduce)| (is_type_maximums & input_maximums)) %>%
      filter(if(is.null(input$status_selector)){is.na(report_status)} 
             else {is.na(report_status) | grepl(tolower(paste(input$status_selector, collapse = "|")), report_status, ignore.case=TRUE)}) %>%
      filter(population >= population_slider_to_numeric(input$poprange[1]) & population <= population_slider_to_numeric(input$poprange[2])) 
    }
  })
  
  filtered_data <- filtered_d %>% debounce(550)
  
  howToMessage = "Cities displayed may still have parking requirements for a few specific uses or in special cases. View summary and detail pages for more information."
  noMandateMessage = "Cities displayed may still have parking requirements for a few specific uses or in special cases. View summary and detail pages for more information."
  # observe filter for highlights
  observeEvent(input$no_mandate_city_selector, {
    if(input$no_mandate_city_selector) { 
      highlights$mandates = c(1) 
      if(sessionVars$notifyMandate) {
        showNotification(noMandateMessage,
                       duration=30,
                       type = "warning",
                       id = "highlightMessage")
        sessionVars$notifyMandate = FALSE
      }
      }
    else { 
        highlights$mandates = c(0,1)
        }
     }
               )
  
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
      paste("https://parkingreform.org/mandates-map/city_detail/", .,".html", sep="") -> url
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
      mutate(report_magnitude = paste("Scope of Reform:", report_magnitude)) %>%
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
  
  # display land uses data for clicked map point
  output$clicked_report_land_uses <- renderText({
    req(input$map_marker_click$id)
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      mutate(land_uses = paste("Land Uses:", land_uses)) %>%
      select(land_uses) %>%
      paste0()
  }
  )
  
  # display status data for clicked map point
  output$clicked_report_status <- renderText({
    req(input$map_marker_click$id)
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      mutate(status = paste("Reform Status:", report_status)) %>%
      select(status) %>%
      paste0()
  }
  )
  
  # display type data for clicked map point
  output$clicked_report_type <- renderText({
    req(input$map_marker_click$id)
    map_data %>%
      filter(id == input$map_marker_click$id) %>%
      mutate(type = paste("Type of Reform:", report_type)) %>%
      select(type) %>%
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
      paste("https://parkingreform.org/mandates-map/city_detail/", .,".html", sep="") -> url
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
  
  observeEvent(input$clickinfoIn, {
    toggle('click_info')
  })
  
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
      
      pal <- colorFactor(
        palette = c("#7b3294", "#fdae61", "#d7191c", "#abdda4", "#2b83ba"),
        c("Regional","City Center","Citywide","Main Street", "TOD"), ordered= TRUE
      )
      
      pal2 <- colorFactor(
        palette = c("#7b3294","#fdae61","#c4874b", "#d7191c","#a71316", "#abdda4", "#84ab7f", "#2b83ba","#216590"),
        c("Regional","City Center", "City Center All","Citywide","Citywide All",  "Main Street", "Main Street All", "TOD", "TOD All"), ordered = TRUE
      )
      
    
      map_points %>%
        leafletProxy("map", data = .) %>%
        clearControls() %>%
        clearMarkers() %>%
        addCircleMarkers(
          lat = ~map_points$lat,
          lng = ~map_points$long,
          layerId = ~map_points$id,
          radius = 7,
          stroke = TRUE,
          weight = .9,
          color = "#FFFFFF",
          fillColor = ~pal(magnitude_encoded),
          fillOpacity = 1,
          label = ~ paste(map_points$city, map_points$state, sep = ", "),
          options = markerOptions(zIndexOffset = map_points$population)) %>%
     
        addLegend(
          title = "Scope of Reform",
          position = "bottomright",
          labels  = c("Regional","Citywide", "City Center/District","Transit Oriented", "Main Street/Special" ),
          colors = c("#7b3294", "#d7191c", "#fdae61", "#2b83ba", "#abdda4")
        )
      
    }
  })
  
}
