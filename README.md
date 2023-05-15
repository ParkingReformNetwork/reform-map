# Parking Reform Network Map

This code runs the Mandates Map app for the Parking Reform Network: https://parkingreform.org/mandates-map/.

The scripts are written in JavaScript and the app in R. We want to rewrite the app to JavaScript.

## Running the map app

### Dependencies

The app is built in [Shiny](https://shiny.rstudio.com/), so you need to install:

- System software:
  - R ('r-base' in Debian/Ubuntu)
  - libcurl4-openssl-dev (`libcurl4-openssl-dev` in Debian/Ubuntu)
  - libgdal-dev (`libgdal-dev` in Debian/Ubuntu)
  - libssl-dev (`libssl-dev`in Debian/Ubuntu)
- R libraries for local development:
  - `dplyr`
  - `fontawesome`
  - `leaflet`
  - `R.rsp`
  - `shiny`
  - `shinyjs`
  - `stringr`
- R libraries for [shinyapps.io](shinyapps.io) deployment:
  - `anytime`
  - `BH`
  - `shinyWidgets`

### Executing program

In the R console, run:

```
library(shiny)
runApp('map')
```

Go to `localhost:[provided port]` in a browser

## Updating the data

You usually should not need to manually do this. We have a GitHub Action that runs every night to open a PR with any updates.

First, `npm install`. Then, run either:

- `npm run update-map-data`, or
- `npm run update-city-detail`.

## Authors

- Brad Baker [@bradmbak](https://twitter.com/bradmbak)
- Alireza Karduni
- Devin Macarthur
- Tony Jordan [@twjpdx23](https://twitter.com/twjpdx23)
- Aaron Snailwood
- Justin Ross
- complete acknowledgements for the project can be found [here](https://parkingreform.org/mandates-map/acknowledgments.html)
