/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs/promises";

import nodeFetch from "node-fetch";
import NodeGeocoder from "node-geocoder";
import Papa from "papaparse";

type Entry = Record<string, any>;

async function fetch(
  url: nodeFetch.RequestInfo,
  options: nodeFetch.RequestInit = {},
): Promise<nodeFetch.Response> {
  return nodeFetch(url, {
    ...options,
    headers: { "User-Agent": "prn-update-map-data" },
  });
}

// -------------------------------------------------------------
// Read/pre-process CSVs
// -------------------------------------------------------------

async function readCityTable(): Promise<Entry[]> {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/aR_AWTAZ6WF8_ZB3HgfOvN/export?key=8-SifuDc4Fg7purFrntOa7bjE0ikjGAy28t36wUBIOJx9vFGZuSR89N1PkSTFXpOk6",
  );
  const csvText = await response.text();
  const data = Papa.parse(csvText, { header: true, dynamicTyping: true })
    .data as Entry[];

  const placeCleaned = data
    .filter((row) => row.City)
    .map((row) => {
      let placeId = row["State/Province"]
        ? `${row.City}_${row["State/Province"]}`
        : row.City;
      placeId = placeId.replace(/\s+/g, "");
      return {
        place: row.City,
        state: row["State/Province"],
        country: row.Country,
        population:
          typeof row.Population === "string"
            ? Number(row.Population.replace(/,/g, ""))
            : row.Population || 0,
        citation_url: `https://parkingreform.org/mandates-map/city_detail/${placeId}.html`,
      };
    });
  return placeCleaned;
}

async function readReportTable(): Promise<Entry[]> {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/bAc5xhhLJ2q4jYYGjaq_24/export?key=8_S1APcQHGN9zfTXEMz_Gz8sel3FCo3RUfEV4f-PBOqE8zy3vG3FpCQcSXQjRDXOqZ",
  );
  const csvText = await response.text();
  const data = Papa.parse(csvText, { header: true, dynamicTyping: true })
    .data as Entry[];

  const checkIncludes = (str: any, term: string): 1 | 0 =>
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
}

async function readOldCsv(): Promise<Entry[]> {
  const csvText = await fs.readFile("map/data.csv", "utf-8");
  const data = Papa.parse(csvText.trim(), {
    header: true,
    dynamicTyping: true,
  }).data as Entry[];

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
}

/**
 * For each row in baseRows, find and join its matching row in newRows.
 *
 * If there are no matching newRows, still keep the base row. Assumes
 * there is not more than one new row per base row.
 */
export function leftJoin(baseRows: Entry[], newRows: Entry[]): Entry[] {
  return baseRows.map((baseRow) => {
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
}

// -------------------------------------------------------------
// Geocoding
// -------------------------------------------------------------

async function ensureRowLatLng(
  row: Entry,
  geocoder: NodeGeocoder.Geocoder,
): Promise<Entry> {
  if (row.lat && row.long) {
    return row;
  }

  const stateQuery = row.state ? `${row.state}, ` : "";
  // We try the most precise query first, then fall back to less precise queries.
  const locationMethods = [
    () => `${row.place}, ${stateQuery}, ${row.country}`,
    () => `${row.place}, ${stateQuery}`,
  ];
  if (stateQuery) {
    locationMethods.push(() => `${row.place}`);
  }

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
}

async function addMissingLatLng(reportData: Entry[]): Promise<Entry[]> {
  const geocoder = NodeGeocoder({ provider: "openstreetmap", fetch });

  // We use a for loop to avoid making too many network calls -> rate limiting.
  const result = [];
  for (const row of reportData) {
    result.push(await ensureRowLatLng(row, geocoder));
  }
  return result;
}

// -------------------------------------------------------------
// Final result
// -------------------------------------------------------------

/**
 * Used to minimize diff with the original R result.
 */
function shouldCsvQuote(val: any, columnIndex: number): boolean {
  return (
    typeof val === "string" || typeof val === "boolean" || columnIndex === 0
  );
}

function postProcessResult(reportData: Entry[]): Entry[] {
  return reportData.sort((a, b) => a.place.localeCompare(b.place));
}

async function writeResult(result: Entry[]): Promise<void> {
  const csv = Papa.unparse(result, { quotes: shouldCsvQuote });
  await fs.writeFile("map/data.csv", csv);
}

// -------------------------------------------------------------
// Main
// -------------------------------------------------------------

async function main(): Promise<void> {
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
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
