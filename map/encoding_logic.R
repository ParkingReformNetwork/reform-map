# encode magnitude for coloring icons
magnitude_to_color <- function(magnitude_string) {
  magnitude_numeric <- "red"
  if(str_detect(tolower(magnitude_string), "citywide")) {
    magnitude_numeric <- "blue"
  } else if(str_detect(tolower(magnitude_string), "city center")) {
    magnitude_numeric <- "orange"
  } else if(str_detect(tolower(magnitude_string), "transit oriented")) {
    magnitude_numeric <- "green"
  } else if(str_detect(tolower(magnitude_string), "main street")) {
    magnitude_numeric <- "purple"
  }
  return(magnitude_numeric)
}

land_use_to_string <- function(land_use_string) {
  land_use_icon <- "car"
  if(str_detect(tolower(land_use_string), "all uses")) {
    land_use_icon <- "city"
  } else if(str_detect(tolower(land_use_string), "residential") &&
            str_detect(tolower(land_use_string), "commercial")) {
    land_use_icon <- "laptop"
  } else if(str_detect(tolower(land_use_string), "commercial")) {
    land_use_icon <- "building"
  } else if(str_detect(tolower(land_use_string), "residential")) {
    land_use_icon <- "home"
  } 
  return(land_use_icon)
}

population_to_bin <- function(population) {
  if(population > 500000) {
    bin <- 1
  } else if(population > 200000) {
    bin <- .7
  } else if(population > 100000) {
    bin <- .4
  } else { 
    bin <- .2
  }
  return(bin)
}
