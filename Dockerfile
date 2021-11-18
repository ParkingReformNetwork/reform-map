FROM openanalytics/r-base

MAINTAINER Brad Baker "bradmbak@gmail.com"

# system libraries of general use
RUN apt-get update && apt-get install -y \
    sudo \
    pandoc \
    pandoc-citeproc \
    libcurl4-gnutls-dev \
    libcairo2-dev \
    libxt-dev \
    libssl-dev \
    libssh2-1-dev \
    libssl1.1 \
    && rm -rf /var/lib/apt/lists/*

# system library dependency for the euler app
RUN apt-get update && apt-get install -y \
    libmpfr-dev \
    && rm -rf /var/lib/apt/lists/*

# basic shiny functionality
RUN R -e "install.packages(c('shiny', 'rmarkdown'), repos='https://cloud.r-project.org/')"

# install dependencies of the euler app
RUN R -e "install.packages(c('BAMMtools', 'dplyr', 'fontawesome', 'leaflet', 'shinyjs', 'stringr', 'shinyWidgets'), repos='https://cloud.r-project.org/')"

# copy the app to the image
RUN mkdir /root/map
COPY map /root/map

EXPOSE 3838

CMD ["R", "-e", "shiny::runApp('/root/map')"]
