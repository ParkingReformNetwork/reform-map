# Parking Reform Network Map

This code runs the map app for the Parking Reform Network. 


## Getting Started

### Dependencies

The app is built in Shiny, so you need to install
* R
* R Libraries: dplyr, fontawesome, leaflet, R.rsp, shiny, shinyjs, stringr, tidygeocoder

### Executing program

#### Map App

* Generate the most up to date data by running `parking_reform.R` which fetches new data
* The local path may need to be changed to work on your computer. The intent is to overwrite the `tidied_map_data.csv` file.
* Run `app.R` to launch the app.

#### Generating Static Webpages

* To generate static pages for each city, run the `create_city_detail_pages.R` script.
* Again local paths may need to changed. The goal is to output files into the `parking_map/city_detail/` folder.

## Authors

- Brad Baker [@bradmbak](https://twitter.com/bradmbak)
- Alireza Karduni

## TODOs:

### Map App:
* Update population transparency scales to make large cities "pop" and have smaller cities fade into the background. Scales found in `encoding_logic.R`.
* Make sidebar menu collapseable.  
* Update city markers to be circles from current teardrop shape.
* Experiment to see if marker size is a better indicator of size than transparency.
* Experiment with both marker size and marker transparency to see if that better conveys transparency.
* Update city icons to custom icons. (Currently waiting on the icons)
* Update badges to custom badges from the "new" and "!!!" badges. (currently waiting on the badges)
* Make PRN and StrongTown logos the same size

### Static Pages: 
* Clean up design on static pages generated from `create_city_detail_pages.R`.
