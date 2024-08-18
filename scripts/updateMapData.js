/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";

import nodeFetch from "node-fetch";
import NodeGeocoder from "node-geocoder";
import Papa from "papaparse";

async function fetch(url, options) {
  return nodeFetch(url, {
    ...options,
    headers: { "User-Agent": "prn-update-map-data" },
  });
}

// -------------------------------------------------------------
// Read/pre-process CSVs
// -------------------------------------------------------------

const readCityTable = async () => {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/aR_AWTAZ6WF8_ZB3HgfOvN/export?key=8-SifuDc4Fg7purFrntOa7bjE0ikjGAy28t36wUBIOJx9vFGZuSR89N1PkSTFXpOk6",
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
        place: row.City,
        state: row["State/Province"],
        country: row.Country,
        population:
          typeof row.Population === "string"
            ? Number(row.Population.replace(/,/g, ""))
            : row.Population || 0,
        citation_url: `https://parkingreform.org/mandates-map/city_detail/${cityState}.html`,
      };
    });
  return cityCleaned;
};

const readReportTable = async () => {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/bAc5xhhLJ2q4jYYGjaq_24/export?key=8_S1APcQHGN9zfTXEMz_Gz8sel3FCo3RUfEV4f-PBOqE8zy3vG3FpCQcSXQjRDXOqZ",
  );
  const csvText = await response.text();
  // Uncomment this to read the file locally. Save the file to `report.csv` in the repo root.
  //  const csvText = await fs.readFile("report.csv", "utf-8");
  const { data } = Papa.parse(csvText, { header: true, dynamicTyping: true });

  const checkIncludes = (str, term) =>
    typeof str === "string" && str.toLowerCase().includes(term) ? 1 : 0;

  return data
    .filter((row) => row.city_id)
    .map((row) => ({
      place: row.city_id,
      state: row.state,
      country: row.country,
      summary: row.Summary || "",
      status: row.Status || "",
      policy_change: row.Type || "",
      scope: row.Magnitude || "",
      land_use: row.Uses || "",
      reporter: row.Reporter || "",
      reform_date: row["Date of Reform"] || "",
      last_updated: row["Last updated"],
      all_minimums_repealed: checkIncludes(row.Highlights, "no mandates"),
    }));
};

const readOldCsv = async () => {
  const csvText = await fs.readFile("map/data.csv", "utf-8");
  const { data } = Papa.parse(csvText.trim(), {
    header: true,
    dynamicTyping: true,
  });

  const mappedData = data.map((row) => ({
    place: row.place,
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
        `${item.place}_${item.state}_${item.country}`,
        item,
      ]),
    ).values(),
  ];
};

/**
 * For each row in baseRows, find and join its matching row in newRows.
 *
 * If there are no matching newRows, still keep the base row. Assumes
 * there is not more than one new row per base row.
 */
export const leftJoin = (baseRows, newRows) =>
  baseRows.map((baseRow) => {
    const matchingRows = newRows.filter(
      (newRow) =>
        newRow.place === baseRow.place &&
        newRow.state === baseRow.state &&
        newRow.country === baseRow.country,
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
    () => `${row.place}, ${row.state}, ${row.country}`,
    () => `${row.place}, ${row.state}`,
    () => `${row.place}`,
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
  const geocoder = NodeGeocoder({ provider: "openstreetmap", fetch });

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

const postProcessResult = (reportData) =>
  reportData.sort((a, b) => a.place.localeCompare(b.place));

const writeResult = async (result) => {
  const csv = Papa.unparse(result, { quotes: shouldCsvQuote });
  await fs.writeFile("map/data.csv", csv);
};

// -------------------------------------------------------------
// Main
// -------------------------------------------------------------

const main = async () => {
  const [cityData, reportData, oldCsvData] = await Promise.all([
    readCityTable(),
    readReportTable(),
    readOldCsv(),
  ]);

  // This adds the population and citation_url to the report rows.
  const mergedData = leftJoin(reportData, cityData);

  // We merge the lat/lng of the previous saved report to avoid hitting the Geocoding API as much.
  const initialResult = leftJoin(mergedData, oldCsvData);

  const withLatLng = await addMissingLatLng(initialResult);
  const finalReport = postProcessResult(withLatLng);
  await writeResult(finalReport);
};

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
