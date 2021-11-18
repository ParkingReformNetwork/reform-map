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

# system library dependency for the app
RUN apt-get update && apt-get install -y \
    libmpfr-dev \
    && rm -rf /var/lib/apt/lists/*

# basic shiny functionality
RUN R -e "install.packages(c('shiny', 'rmarkdown'), repos='https://cloud.r-project.org/')"

# install app dependencies
RUN R -e "install.packages(c('BAMMtools', 'dplyr', 'fontawesome', 'shinyjs', 'stringr', 'shinyWidgets'), repos='https://cloud.r-project.org/')"

# install leaflet from source
RUN R -e "install.packages("https://cran.r-project.org/src/contrib/leaflet_2.0.4.1.tar.gz", repos=NULL)"

# copy the app to the image
RUN mkdir /root/map
COPY map /root/map

EXPOSE 3838

CMD ["R", "-e", "shiny::runApp('/root/map')"]
