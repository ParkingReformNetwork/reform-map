# Parking Reform Network Map

This code runs the map app for the Parking Reform Network. 


## Getting Started

### Dependencies

The app is built in [Shiny](https://shiny.rstudio.com/), so you need to install:
* System software:
    * R ('r-base' in Debian/Ubuntu)
    * libcurl4-openssl-dev (`libcurl4-openssl-dev` in Debian/Ubuntu)
    * libgdal-dev (`libgdal-dev` in Debian/Ubuntu)
    * libssl-dev (`libssl-dev`in Debian/Ubuntu)
* R libraries for local development: 
    * `dplyr`
    * `fontawesome`
    * `leaflet`
    * `R.rsp`
    * `shiny`
    * `shinyjs`
    * `stringr`
    * `tidygeocoder`
* R libraries for [shinyapps.io](shinyapps.io) deployment:
    * `anytime`
    * `BH`
    * `shinyWidgets`

### Executing program

#### Map App

* Copy the `initial_tidied_map_data.csv` in the same folder and call it `tidied_map_data.csv`. This is a snapshot of the Parking Reform Network data.
* If you want the most up to date data, run the `generate_map_data.R` script.
* The local path may need to be changed to work on your computer. The intent is to overwrite the `tidied_map_data.csv` file.
* In the R console, run:
```
library(shiny)
runApp('map')
```
* Go to `localhost:[provided port]` in a browser

#### Generating Static Webpages

* To generate static pages for each city, run the `create_city_detail_pages.R` script.
* Again local paths may need to changed. The goal is to output files into the `parking_map/city_detail/` folder.

## Authors

- Brad Baker [@bradmbak](https://twitter.com/bradmbak)
- Alireza Karduni
- Devin Macarthur
- Tony Jordan [@twjpdx23](https://twitter.com/twjpdx23)
- Aaron Snailwood
- Justin Ross
- complete acknowledgements for the project can be found [here](https://parkingreform.org/mandates-map/acknowledgments.html)

## TODOs:

### Map App:

### Static Pages: 

### Shiny Server/app
* figure out how to automate data update

### Overall
* develop simple standalone map in leaflet/similar
