# setup
library(dplyr)
library(tidygeocoder)
library(stringr)
source(file="map/encoding_logic.R")



# download files
city <- read.csv(url("https://area120tables.googleapis.com/link/aR_AWTAZ6WF8_ZB3HgfOvN/export?key=8-SifuDc4Fg7purFrntOa7bjE0ikjGAy28t36wUBIOJx9vFGZuSR89N1PkSTFXpOk6"), stringsAsFactors = F)
report <- read.csv(url("https://area120tables.googleapis.com/link/bAc5xhhLJ2q4jYYGjaq_24/export?key=8_S1APcQHGN9zfTXEMz_Gz8sel3FCo3RUfEV4f-PBOqE8zy3vG3FpCQcSXQjRDXOqZ"), stringsAsFactors = F)
# citation <- read.csv(url("https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc"), stringsAsFactors = F  )
# contact <- read.csv(url("https://area120tables.googleapis.com/link/9yPvvVQT8vbbbmal5Oc4I6/export?key=8VZHmPJawsY3T39bP2t4nL9Q7_dfkZR5g6wMCY1fOOswaEJMLQ4jEwF6sFsaB5SkfJ"), stringsAsFactors = F)

city %>% 
  mutate(city_state = str_replace_all(paste(City, State.Province, sep="_"), " ", "")) %>%
  mutate(citation_url = paste("https://parkingreform.org/mandates-map/city_detail/", city_state,".html", sep="")) %>%
  select(City, State.Province, Country, Population, Notable, Recent, citation_url) %>%
  mutate(Population = as.numeric(gsub(",", "", Population))) %>%
  rename(city = City,
         state = State.Province,
         country = Country,
         population = Population,
         is_notable = Notable, 
         is_recent = Recent) -> city_cleaned

# create a flag for verified, only select columns we need, tidy up the names a bit
report %>%
  mutate(is_verified = ifelse(lengths(strsplit(Verified.By, ",")) >= 2, 1, 0)) %>%
  mutate(is_magnitude_regional = ifelse(str_detect(tolower(Magnitude), "regional"), 1, 0))  %>%
  mutate(is_magnitude_citywide = ifelse(str_detect(tolower(Magnitude), "citywide"), 1, 0))  %>%
  mutate(is_magnitude_citycenter = ifelse(str_detect(tolower(Magnitude), "city center/business district"), 1, 0))  %>%
  mutate(is_magnitude_transit = ifelse(str_detect(tolower(Magnitude), "transit oriented"), 1, 0))  %>%
  mutate(is_magnitude_mainstreet = ifelse(str_detect(tolower(Magnitude), "main street/special"), 1, 0))  %>%
  mutate(is_type_eliminated = ifelse(str_detect(tolower(Type), "eliminate parking minimums"), 1, 0))  %>%
  mutate(is_type_reduced = ifelse(str_detect(tolower(Type), "reduce parking minimums"), 1, 0))  %>%
  mutate(is_type_maximums = ifelse(str_detect(tolower(Type), "parking maximums"), 1, 0))  %>%
  mutate(is_uses_alluses = ifelse(str_detect(tolower(Uses), "all uses"), 1, 0))  %>%
  mutate(is_uses_residential = ifelse(str_detect(tolower(Uses), "residential"), 1, 0))  %>%
  mutate(is_uses_commercial = ifelse(str_detect(tolower(Uses), "commercial"), 1, 0))  %>%
  mutate(is_uses_lowdensity = ifelse(str_detect(tolower(Uses), "low density (sf) residential"), 1, 0))  %>%
  mutate(is_uses_multifamily = ifelse(str_detect(tolower(Uses), "multi-family residential"), 1, 0))  %>%
  mutate(is_no_mandate_city = ifelse(str_detect(tolower(Highlights), "no mandates"), 1, 0))  %>%
  
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
         Date.of.Reform,
         Last.updated,
         is_verified,
         is_magnitude_regional,
         is_magnitude_citywide,
         is_magnitude_citycenter,
         is_magnitude_transit,
         is_magnitude_mainstreet,
         is_type_eliminated,
         is_type_reduced,
         is_type_maximums,
         is_uses_alluses,
         is_uses_residential,
         is_uses_commercial,
         is_uses_lowdensity,
         is_uses_multifamily,
         is_no_mandate_city) %>%
  rename(city = city_id,
         date_of_reform = Date.of.Reform,
         last_updated = Last.updated,
         report_summary = Summary,
         report_status = Status,
         report_type = Type,
         report_magnitude = Magnitude,
         land_uses = Uses,
         reporter_name = Reporter,
         ) %>%
  left_join(., city_cleaned, by = c("city" = "city", 
                                    "state" = "state", 
                                    "country" = "country")
            ) -> report_trimmed

# geocode addresses
# read in past geocoded files to not have to hit geocoding api as much
read.csv(file = "map/tidied_map_data.csv", stringsAsFactors = F) %>%
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
  
  # check if there are still missing lats
  new_lat_long_city_state %>%
    filter(is.na(lat)) %>%
    count() %>% as.integer()-> num_na_lats
}

if(num_na_lats > 0) {
  # get lat/longs for county state if above failed
  new_lat_long_city_state %>%
    filter(is.na(lat)) %>% 
    select(!c(lat, long)) %>%
    geocode(county = city, state = state,
            method = "osm", verbose = TRUE) -> new_lat_long_city_state
  
  # check if there are still missing lats
  new_lat_long_city_state %>%
    filter(is.na(lat)) %>%
    count() %>% as.integer()-> num_na_lats
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

# add id column and sort by population
report_trimmed %>%
  mutate(id = paste(city, state, country, sep = "")) %>%
  arrange(population) -> report_trimmed

# apply encoding logic for the map icons, transparency, and color
report_trimmed %>% 
  rowwise() %>% 
  mutate(magnitude_encoded = magnitude_to_highest(report_magnitude)) %>%
  mutate(border_encoded = magnitude_to_highest_or_alluses(report_magnitude, land_uses)) %>%
  mutate(land_use_encoded = land_use_to_string(land_uses)) %>%
  mutate(population_encoded = population_to_bin(population)) %>%
  mutate(city_search = paste(city, state, sep = ", ")) %>%
  mutate(is_special = if_else(is_notable == "true", "highlighed_icon", if_else(is_recent == "true", "new_icon", "not_special_icon")))  -> report_trimmed

# delete old file and save over the new one
system("rm -fr map/tidied_map_data.csv")
write.csv(report_trimmed, file = "map/tidied_map_data.csv")
report_trimmed %>% select(-contains('is_magnitude')) %>% select(-contains('is_type')) -> report_trimmed
report_trimmed %>% select(-contains('is_uses')) -> report_trimmed
report_trimmed %>% select(-contains('encoded')) -> report_trimmed
report_trimmed %>% select(-one_of('is_notable', 'is_recent', 'is_special', 'id', 'is_verified', 'city_search')) -> report_trimmed

# delete old file and save over the new one
system("rm -fr map/trimmed_map_data.csv")
write.csv(report_trimmed, file = "map/trimmed_map_data.csv")




