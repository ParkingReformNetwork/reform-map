library(R.rsp)
library(dplyr)
library(stringr)
library(lubridate)

global_last_updated <- readLines("city_detail_last_updated.txt") %>%
  mdy_hms()

citation <- read.csv(url("https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc"), stringsAsFactors = F)

citation %>%
  mutate(city_state = paste(City, State, sep ="_")) -> citation

citation %>%
  select(city_state) %>%
  unique() -> city_states

# Redefine city_states to be a vector.
city_states$city_state -> city_states


for(i in 1:length(city_states)) {
  city_state <- city_states[i]
  city_df <- citation[citation$city_state == city_state,]

  city_last_updated <- max(
    # This may be >1 citation.
    mdy_hms(city_df$Last.updated),
    mdy_hms(city_df$Report.Last.updated[1]),
    mdy_hms(city_df$City.Last.updated[1])
  )
  if (city_last_updated < global_last_updated) {
    cat("Skipping", city_state, "\n")
    next
  }

  cat("Updating", city_state, "\n")
  city_state_no_space <- str_replace_all(city_state, " ", "")

  # These variables are used by citation_template_html.rsp.
  city <- city_df$City[1]
  state <- city_df$State[1]
  rfile(file="citation_template.html.rsp",
        output=paste0("city_detail/", city_state_no_space, ".html"))
}

# Update the last updated time.
cat("Updating city_detail_last_updated.txt with today's date")
current_datetime <- Sys.time()
formatted_datetime <- format(current_datetime, format = "%B %d, %Y, %I:%M:%S %p")
writeLines(formatted_datetime, "city_detail_last_updated.txt")
