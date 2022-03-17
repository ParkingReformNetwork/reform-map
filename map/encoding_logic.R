# encode magnitude for coloring icons
magnitude_to_highest <- function(magnitude_string) {
  magnitude_highest <- "NA"
  if(str_detect(tolower(magnitude_string), "regional")) {
    magnitude_highest <- "Regional"
  } else if(str_detect(tolower(magnitude_string), "citywide")) {
    magnitude_highest <- "Citywide"
  } else if(str_detect(tolower(magnitude_string), "city center")) {
    magnitude_highest <- "City Center"
  } else if(str_detect(tolower(magnitude_string), "transit oriented")) {
    magnitude_highest <- "TOD"
  } else if(str_detect(tolower(magnitude_string), "main street")) {
    magnitude_highest <- "Main Street"
  }
  return(magnitude_highest)
}

# encode magnitude for coloring icons
magnitude_to_highest_or_alluses <- function(magnitude_string, landuses_string) {
  magnitude_highest <- "NA"
  is_all_use = any(str_detect(tolower(landuses_string), "all uses"))
  if((str_detect(tolower(magnitude_string), "citywide") & is_all_use)) {
    magnitude_highest <- "Citywide All"
  } else if(str_detect(tolower(magnitude_string), "citywide")) {
    magnitude_highest <- "Citywide"
  } else if(str_detect(tolower(magnitude_string), "city center") & is_all_use) {
    magnitude_highest <- "City Center All"
  } else if(str_detect(tolower(magnitude_string), "city center")) {
    magnitude_highest <- "City Center"
  } else if(str_detect(tolower(magnitude_string), "transit oriented") & is_all_use) {
    magnitude_highest <- "TOD"
  } else if(str_detect(tolower(magnitude_string), "transit oriented")) {
    magnitude_highest <- "TOD All"
  } else if(str_detect(tolower(magnitude_string), "main street") & is_all_use) {
    magnitude_highest <- "Main Street"
  } else if(str_detect(tolower(magnitude_string), "main street")) {
    magnitude_highest <- "Main Street All"
  }
  return(magnitude_highest)
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
