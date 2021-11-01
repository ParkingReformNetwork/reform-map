library(R.rsp)
library(dplyr)
library(stringr)

citation <- read.csv(url("https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc"), stringsAsFactors = F)


citation %>%
  mutate(city_state = paste(City, State, sep ="_")) -> citation

citation %>%
  select(city_state) %>%
  unique() -> city_states

city_states$city_state -> city_states


for(i in 1:length(city_states)) {
  city_state <- city_states[i]
  city_state_no_space <- str_replace_all(city_state, " ", "")
  city_df <- citation[citation$city_state == city_state,]
  city <- city_df$City[1]
  state <- city_df$State[1]
  rfile(file="citation_template.html.rsp",
        output=paste("city_detail/", city_state_no_space, ".html", sep=""))
}
