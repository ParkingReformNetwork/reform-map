/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";

import fetch from "node-fetch";
import NodeGeocoder from "node-geocoder";
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
    "https://area120tables.googleapis.com/link/aR_AWTAZ6WF8_ZB3HgfOvN/export?key=8-SifuDc4Fg7purFrntOa7bjE0ikjGAy28t36wUBIOJx9vFGZuSR89N1PkSTFXpOk6",
    {
      headers: { "User-Agent": "prn-update-map-data" },
    }
  );
  const csvText = await response.text();
  // Uncomment this to read the file locally. Save the file to `city.csv` in the repo root.
  //  const csvText = await fs.readFile("city.csv", "utf-8");
  const { data } = Papa.parse(csvText, { header: true, dynamicTyping: true });

  const cityCleaned = data
    .filter((row) => row.City)
    .map((row) => {
      let cityState = row["State/Province"]
        ? `${row.City}_${row["State/Province"]}`
        : row.City;
      cityState = cityState.replace(/\s+/g, "");
      return {
        city: row.City,
        state: row["State/Province"],
        country: row.Country,
        population:
          typeof row.Population === "string"
            ? Number(row.Population.replace(/,/g, ""))
            : row.Population || 0,
        is_notable: row.Notable === null ? "" : row.Notable,
        is_recent: row.Recent === null ? "" : row.Recent,
        citation_url: `https://parkingreform.org/mandates-map/city_detail/${cityState}.html`,
      };
    });
  return cityCleaned;
};

const readReportCsv = async () => {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/bAc5xhhLJ2q4jYYGjaq_24/export?key=8_S1APcQHGN9zfTXEMz_Gz8sel3FCo3RUfEV4f-PBOqE8zy3vG3FpCQcSXQjRDXOqZ",
    {
      headers: { "User-Agent": "prn-update-map-data" },
    }
  );
  const csvText = await response.text();
  // Uncomment this to read the file locally. Save the file to `report.csv` in the repo root.
  //  const csvText = await fs.readFile("report.csv", "utf-8");
  const { data } = Papa.parse(csvText, { header: true, dynamicTyping: true });

  const checkIncludes = (str, term) =>
    typeof str === "string" && str.toLowerCase().includes(term) ? 1 : 0;

  const reportTrimmed = data
    .filter((row) => row.city_id)
    .map((row) => ({
      city: row.city_id,
      state: row.state,
      country: row.country,
      report_summary: row.Summary || "",
      report_status: row.Status || "",
      report_type: row.Type || "",
      report_magnitude: row.Magnitude || "",
      land_uses: row.Uses || "",
      reporter_name: row.Reporter || "",
      date_of_reform: row["Date of Reform"] || "",
      last_updated: row["Last updated"],
      is_verified: row["Verified By"]?.split(",").length >= 2 ? 1 : 0,
      is_magnitude_regional: checkIncludes(row.Magnitude, "regional"),
      is_magnitude_citywide: checkIncludes(row.Magnitude, "citywide"),
      is_magnitude_citycenter: checkIncludes(
        row.Magnitude,
        "city center/business district"
      ),
      is_magnitude_transit: checkIncludes(row.Magnitude, "transit oriented"),
      is_magnitude_mainstreet: checkIncludes(
        row.Magnitude,
        "main street/special"
      ),
      is_type_eliminated: checkIncludes(row.Type, "eliminate parking minimums"),
      is_type_reduced: checkIncludes(row.Type, "reduce parking minimums"),
      is_type_maximums: checkIncludes(row.Type, "parking maximums"),
      is_uses_alluses: checkIncludes(row.Uses, "all uses"),
      is_uses_residential: checkIncludes(row.Uses, "residential"),
      is_uses_commercial: checkIncludes(row.Uses, "commercial"),
      is_uses_lowdensity: checkIncludes(
        row.Uses,
        "low density (sf) residential"
      ),
      is_uses_multifamily: checkIncludes(row.Uses, "multi-family residential"),
      is_no_mandate_city: checkIncludes(row.Highlights, "no mandates"),
    }));
  return reportTrimmed;
};

const readOldReportCsv = async () => {
  const csvText = await fs.readFile("map/tidied_map_data.csv", "utf-8");
  const { data } = Papa.parse(csvText.trim(), {
    header: true,
    dynamicTyping: true,
  });

  const mappedData = data.map((row) => ({
    city: row.city,
    state: row.state,
    country: row.country,
    lat: row.lat,
    long: row.long,
  }));

  // We use a map to deduplicate. Note that a Set would not work properly
  // due to JavaScript's strict equality checks for objects.
  return [
    ...new Map(
      mappedData.map((item) => [
        `${item.city}_${item.state}_${item.country}`,
        item,
      ])
    ).values(),
  ];
};

/**
 * For each row in baseRows, find and join its matching row in newRows.
 *
 * If there are no matching newRows, still keep the base row. Assumes
 * there is not more than one new row per base row.
 */
const leftJoin = (baseRows, newRows) =>
  baseRows.map((baseRow) => {
    const matchingRows = newRows.filter(
      (newRow) =>
        newRow.city === baseRow.city &&
        newRow.state === baseRow.state &&
        newRow.country === baseRow.country
    );

    return matchingRows.length > 0
      ? { ...baseRow, ...matchingRows[0] }
      : baseRow;
  });

// -------------------------------------------------------------
// Geocoding
// -------------------------------------------------------------

const ensureRowLatLng = async (row, geocoder) => {
  if (row.lat && row.long) {
    return row;
  }

  // We try the most precise query first, then fall back to less precise queries.
  const locationMethods = [
    () => `${row.city}, ${row.state}, ${row.country}`,
    () => `${row.city}, ${row.state}`,
    () => `${row.city}`,
  ];
  for (const getLocationString of locationMethods) {
    const locationString = getLocationString();
    const geocodeResults = await geocoder.geocode(locationString);
    if (geocodeResults.length > 0) {
      return {
        ...row,
        lat: geocodeResults[0].latitude,
        long: geocodeResults[0].longitude,
      };
    }
  }
  return row;
};

const addMissingLatLng = async (reportData) => {
  const geocoder = NodeGeocoder({ provider: "openstreetmap" });

  // We use a for loop to avoid making too many network calls -> rate limiting.
  const result = [];
  for (const row of reportData) {
    result.push(await ensureRowLatLng(row, geocoder));
  }
  return result;
};

// -------------------------------------------------------------
// Final result
// -------------------------------------------------------------

/**
 * Used to minimize diff with the original R result.
 */
const shouldCsvQuote = (val, columnIndex) =>
  typeof val === "string" || typeof val === "boolean" || columnIndex === 0;

const determineSpecialLabel = (row) => {
  if (row.is_notable === true) {
    return "highlighed_icon";
  }
  if (row.is_recent === true) {
    return "new_icon";
  }
  return "not_special_icon";
};

const postProcessResult = (reportData) =>
  reportData
    .sort((a, b) => a.city.localeCompare(b.city))
    .map((row) => ({
      ...row,
      id: row.city + row.state + row.country,
      magnitude_encoded: magnitudeToHighest(row.report_magnitude),
      border_encoded: magnitudeToHighestOrAllUses(
        row.report_magnitude,
        row.land_uses
      ),
      land_use_encoded: landUseToString(row.land_uses),
      population_encoded: populationToBin(row.population),
      city_search: `${row.city}, ${row.state}`,
      is_special: determineSpecialLabel(row),
    }));

const writeResult = async (result) => {
  const csv = Papa.unparse(result, { quotes: shouldCsvQuote });
  await fs.writeFile("map/tidied_map_data.csv", csv);
};

// -------------------------------------------------------------
// Trimmed report
// -------------------------------------------------------------

/**
 * Write trimmed_map_data.csv, which we share for external consumption.
 */
const writeTrimmedReport = async (finalReport) => {
  const excludedKeys = [
    "is_notable",
    "is_recent",
    "is_special",
    "id",
    "is_verified",
    "city_search",
  ];
  const trimmed = finalReport.map((row) =>
    Object.fromEntries(
      Object.entries(row).filter(
        ([key]) =>
          !(
            excludedKeys.includes(key) ||
            key.includes("is_magnitude") ||
            key.includes("is_type") ||
            key.includes("is_uses") ||
            key.includes("encoded")
          )
      )
    )
  );
  const csv = Papa.unparse(trimmed, { quotes: shouldCsvQuote });
  await fs.writeFile("map/trimmed_map_data.csv", csv);
};

// -------------------------------------------------------------
// Main
// -------------------------------------------------------------

const main = async () => {
  const [cityData, reportData, oldReportData] = await Promise.all([
    readCityCsv(),
    readReportCsv(),
    readOldReportCsv(),
  ]);

  // This adds the population and citation_url to the report rows.
  const mergedData = leftJoin(reportData, cityData);

  // We merge the lat/lng of the previous saved report to avoid hitting the Geocoding API as much.
  const initialResult = leftJoin(mergedData, oldReportData);

  const withLatLng = await addMissingLatLng(initialResult);
  const finalReport = postProcessResult(withLatLng);
  await Promise.all([
    writeResult(finalReport),
    writeTrimmedReport(finalReport),
  ]);
};

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => console.error(error));
}

export {
  leftJoin,
  magnitudeToHighest,
  magnitudeToHighestOrAllUses,
  landUseToString,
  populationToBin,
};
