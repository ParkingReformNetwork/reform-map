# setup
library(dplyr)
library(tidygeocoder)
library(stringr)
setwd("~/repos/parking_map/map/")
source(file="encoding_logic.R")


# download files
city <- read.csv(url("https://area120tables.googleapis.com/link/aR_AWTAZ6WF8_ZB3HgfOvN/export?key=8-SifuDc4Fg7purFrntOa7bjE0ikjGAy28t36wUBIOJx9vFGZuSR89N1PkSTFXpOk6"))
report <- read.csv(url("https://area120tables.googleapis.com/link/bAc5xhhLJ2q4jYYGjaq_24/export?key=8_S1APcQHGN9zfTXEMz_Gz8sel3FCo3RUfEV4f-PBOqE8zy3vG3FpCQcSXQjRDXOqZ"))
citation <- read.csv(url("https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc"))
contact <- read.csv(url("https://area120tables.googleapis.com/link/9yPvvVQT8vbbbmal5Oc4I6/export?key=8VZHmPJawsY3T39bP2t4nL9Q7_dfkZR5g6wMCY1fOOswaEJMLQ4jEwF6sFsaB5SkfJ"))

# create a flag for verified, only select columns we need, tidy up the names a bit
report %>%
  mutate(population = 1) %>% # TODO: update when population is added
  mutate(is_verified = ifelse(lengths(strsplit(Verified.By, ",")) >= 2, 1, 0)) %>%
  ## filter(is_verified == 1) %>%  ## TODO: add this filter back in
  select(city_id,
         state,
         country,
         Summary,
         Status,
         Type,
         Magnitude,
         Uses,
         Reporter,
         population,
         is_verified) %>%
  rename(city = city_id,
         report_summary = Summary,
         report_status = Status,
         report_type = Type,
         report_magnitude = Magnitude,
         land_uses = Uses,
         reporter_name = Reporter,
         ) -> report_trimmed

# geocode addresses
# read in past geocoded files to not have to hit geocoding api as much
read.csv(file = "tidied_map_data.csv") %>%
  select(city, state, country, lat, long) %>%
  distinct() -> old_report

left_join(report_trimmed, old_report,
          by = c("city" = "city",
                 "state" = "state", 
                 "country" = "country")) -> report_trimmed

report_trimmed %>%
  filter(is.na(lat)) %>%
  count() %>% as.integer()-> num_na_lats

if(num_na_lats > 0) {
  # get lat/longs for city, state, country groups
  report_trimmed %>%
    filter(is.na(lat)) %>% 
    select(!c(lat, long)) %>%
    geocode(city = city, state = state, country = country, 
            method = "osm", verbose = TRUE) -> new_lat_long_city_state_country

  # check if there are still missing lats
  new_lat_long_city_state_country %>%
    filter(is.na(lat)) %>%
    count() %>% as.integer()-> num_na_lats
  
}

if(num_na_lats > 0) {
  # get lat/longs for city, state pairs if country failed
  new_lat_long_city_state_country %>%
    filter(is.na(lat)) %>% 
    select(!c(lat, long)) %>%
    geocode(city = city, state = state,
            method = "osm", verbose = TRUE) -> new_lat_long_city_state
  
  # check if there are still missing lats
  new_lat_long_city_state %>%
    filter(is.na(lat)) %>%
    count() %>% as.integer()-> num_na_lats
}
 
if(num_na_lats > 0) {
  # get lat/longs for city alone if above failed
  new_lat_long_city_state %>%
    filter(is.na(lat)) %>% 
    select(!c(lat, long)) %>%
    geocode(city = city,
            method = "osm", verbose = TRUE) -> new_lat_long_city
}

# union up data if it exists
if(exists("new_lat_long_city_state_country") && 
   nrow(new_lat_long_city_state_country) > 0){
  bind_rows(report_trimmed[!is.na(report_trimmed$lat),],
            new_lat_long_city_state_country[!is.na(new_lat_long_city_state_country$lat),]) -> report_trimmed
  
}

if(exists("new_lat_long_city_state") && 
   nrow(new_lat_long_city_state) > 0){
  bind_rows(report_trimmed[!is.na(report_trimmed$lat),],
            new_lat_long_city_state[!is.na(new_lat_long_city_state$lat),]) -> report_trimmed
  
}

if(exists("new_lat_long_city") && 
   nrow(new_lat_long_city) > 0){
  bind_rows(report_trimmed[!is.na(report_trimmed$lat),],
            new_lat_long_city[!is.na(new_lat_long_city$lat),]) -> report_trimmed
  
}

# add id column 
report_trimmed <- report_trimmed %>%
  mutate(id = paste(city, state, country, sep = ""))

# apply logic to encode magnitude
report_trimmed %>% 
  rowwise() %>% 
  mutate(magnitude_encoded = magnitude_to_color(report_magnitude)) %>%
  mutate(land_use_encoded = land_use_to_string(land_uses)) %>%
  mutate(population = sample(1200000,1)) %>%# TODO: remove next row once population is added
  mutate(population_encoded = population_to_bin(population)) %>%
  mutate(is_new = sample(100,1)) %>% 
  mutate(is_highlighted = sample(100,1)) %>%
  mutate(is_special = if_else(is_highlighted < 5, "highlighed_icon", if_else(is_new < 10, "new_icon", "not_special_icon")))  -> report_trimmed

# delete old file and save over the new one
system("rm -fr tidied_map_data.csv")
write.csv(report_trimmed, file = "tidied_map_data.csv")

