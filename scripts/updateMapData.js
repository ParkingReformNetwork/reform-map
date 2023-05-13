/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

import fetch from "node-fetch";
import Papa from "papaparse";

// -------------------------------------------------------------
// Encoding logic
// -------------------------------------------------------------

const magnitudeToHighest = (magnitudeString) => {
  const lowerCaseString = magnitudeString.toLowerCase();
  if (lowerCaseString.includes("regional")) {
    return "Regional";
  }
  if (lowerCaseString.includes("citywide")) {
    return "Citywide";
  }
  if (lowerCaseString.includes("city center")) {
    return "City Center";
  }
  if (lowerCaseString.includes("transit oriented")) {
    return "TOD";
  }
  if (lowerCaseString.includes("main street")) {
    return "Main Street";
  }
  return "NA";
};

const magnitudeToHighestOrAllUses = (magnitudeString, landusesString) => {
  const isAllUse = landusesString.toLowerCase().includes("all uses");
  const lowerCaseMagnitude = magnitudeString.toLowerCase();
  if (lowerCaseMagnitude.includes("citywide") && isAllUse) {
    return "Citywide All";
  }
  if (lowerCaseMagnitude.includes("citywide")) {
    return "Citywide";
  }
  if (lowerCaseMagnitude.includes("city center") && isAllUse) {
    return "City Center All";
  }
  if (lowerCaseMagnitude.includes("city center")) {
    return "City Center";
  }
  if (lowerCaseMagnitude.includes("transit oriented") && isAllUse) {
    return "TOD";
  }
  if (lowerCaseMagnitude.includes("transit oriented")) {
    return "TOD All";
  }
  if (lowerCaseMagnitude.includes("main street") && isAllUse) {
    return "Main Street";
  }
  if (lowerCaseMagnitude.includes("main street")) {
    return "Main Street All";
  }
  return "NA";
};

const landUseToString = (landUseString) => {
  const lowerCaseLandUse = landUseString.toLowerCase();
  if (lowerCaseLandUse.includes("all uses")) {
    return "city";
  }
  if (
    lowerCaseLandUse.includes("residential") &&
    lowerCaseLandUse.includes("commercial")
  ) {
    return "laptop";
  }
  if (lowerCaseLandUse.includes("commercial")) {
    return "building";
  }
  if (lowerCaseLandUse.includes("residential")) {
    return "home";
  }
  return "car";
};

const populationToBin = (population) => {
  if (population > 500000) {
    return 1;
  }
  if (population > 200000) {
    return 0.7;
  }
  if (population > 100000) {
    return 0.4;
  }
  return 0.2;
};

// -------------------------------------------------------------
// Read/pre-process CSVs
// -------------------------------------------------------------

const readCityCsv = async () => {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/aR_AWTAZ6WF8_ZB3HgfOvN/export?key=8-SifuDc4Fg7purFrntOa7bjE0ikjGAy28t36wUBIOJx9vFGZuSR89N1PkSTFXpOk6"
  );
  const csvText = await response.text();
  const { data } = Papa.parse(csvText, { header: true, dynamicTyping: true });

  const cityCleaned = data.map((row) => {
    const cityState = `${row.City}_${row["State/Province"]}`.replace(
      /\s+/g,
      ""
    );
    return {
      city: row.City,
      state: row["State/Province"],
      country: row.Country,
      population:
        typeof row.Population === "string"
          ? Number(row.Population.replace(",", ""))
          : row.Population || 0,
      // TODO: row.Notable is not set in the CSV, so it always ends up being false. Remove
      //  this logic once done porting.
      is_notable: false,
      // TODO: row.Recent is not set in the CSV, so it always ends up being false. Remove
      //  this logic once done porting.
      is_recent: false,
      citation_url: `https://parkingreform.org/mandates-map/city_detail/${cityState}.html`,
    };
  });
  return cityCleaned;
};

if (process.env.NODE_ENV !== "test") {
  console.log(await readCityCsv());
}

export {
  magnitudeToHighest,
  magnitudeToHighestOrAllUses,
  landUseToString,
  populationToBin,
};
