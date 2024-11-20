/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-explicit-any */

import nodeFetch from "node-fetch";
import Papa from "papaparse";
import { DateTime } from "luxon";

import { initGeocoder, getLongLat } from "./lib/geocoder";
import { readCoreData, saveCoreData, splitStringArray } from "./lib/data";
import { PlaceId, RawEntry } from "../src/js/types";

type Row = Record<string, any>;

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
// Read Google Tables
// -------------------------------------------------------------

async function readCityTable(): Promise<Row[]> {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/aR_AWTAZ6WF8_ZB3HgfOvN/export?key=8-SifuDc4Fg7purFrntOa7bjE0ikjGAy28t36wUBIOJx9vFGZuSR89N1PkSTFXpOk6",
  );
  const csvText = await response.text();
  const data = Papa.parse(csvText, { header: true, dynamicTyping: true })
    .data as Row[];

  const placeCleaned = data
    .filter((row) => row.City)
    .map((row) => {
      const population =
        typeof row.Population === "string"
          ? Number(row.Population.replace(/,/g, ""))
          : row.Population || 0;
      return {
        place: row.City,
        state: row["State/Province"] || null,
        country: row.Country,
        pop: population,
      };
    });
  return placeCleaned;
}

function normalizeReformDate(v: string | null): string | null {
  return v
    ? DateTime.fromFormat(v, "LLL d, yyyy").toFormat("yyyy-MM-dd")
    : null;
}

async function readReportTable(): Promise<Row[]> {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/bAc5xhhLJ2q4jYYGjaq_24/export?key=8_S1APcQHGN9zfTXEMz_Gz8sel3FCo3RUfEV4f-PBOqE8zy3vG3FpCQcSXQjRDXOqZ",
  );
  const csvText = await response.text();
  const data = Papa.parse(csvText, { header: true, dynamicTyping: true })
    .data as Row[];

  const checkIncludes = (str: any, term: string): boolean =>
    typeof str === "string" && str.toLowerCase().includes(term);

  return data
    .filter((row) => row.city_id)
    .map((row) => ({
      place: row.city_id,
      state: row.state || null,
      country: row.country,
      summary: row.Summary,
      status: row.Status.toLowerCase(),
      policy: splitStringArray(row.Type, {
        "parking maximums": "add parking maximums",
        "eliminate parking minimums": "remove parking minimums",
      }),
      scope: splitStringArray(row.Magnitude, {
        "city center/business district": "city center / business district",
        "main street/special": "main street / special",
      }),
      land: splitStringArray(row.Uses, {
        residential: "residential, all uses",
        "low density (sf) residential": "residential, low-density",
        "high density residential": "residential, high-density",
        "multi-family residential": "residential, multi-family",
      }),
      date: normalizeReformDate(row["Date of Reform"] || null),
      repeal: checkIncludes(row.Highlights, "no mandates"),
    }));
}

// -------------------------------------------------------------
// Process data
// -------------------------------------------------------------

/**
 * For each row in baseRows, find and join its matching row in newRows.
 *
 * Validates that there is exactly one match.
 */
export function join(baseRows: Row[], newRows: Row[]): Row[] {
  return baseRows.map((baseRow) => {
    const matchingRows = newRows.filter(
      (newRow) =>
        newRow.place === baseRow.place &&
        newRow.state === baseRow.state &&
        newRow.country === baseRow.country,
    );
    if (!matchingRows.length) {
      throw new Error(`No rows matched for ${baseRow.place} ${baseRow.state}`);
    }
    if (matchingRows.length > 1) {
      throw new Error(`>1 row matched for ${baseRow.place} ${baseRow.state}`);
    }
    return { ...baseRow, ...matchingRows[0] };
  });
}

function addCachedLatLng(
  tablesRows: Row[],
  coreData: Record<PlaceId, RawEntry>,
): Record<PlaceId, RawEntry> {
  return Object.fromEntries(
    tablesRows
      .map((row) => {
        const placeId = row.state ? `${row.place}, ${row.state}` : row.place;
        const coord = coreData[placeId]?.coord ?? null;
        return [placeId, { ...row, coord }];
      })
      .sort(),
  );
}

// -------------------------------------------------------------
// Geocoding
// -------------------------------------------------------------

async function addMissingLatLng(
  data: Record<PlaceId, RawEntry>,
): Promise<Record<PlaceId, RawEntry>> {
  const geocoder = initGeocoder();

  // We use a for loop to avoid making too many network calls -> rate limiting.
  const result: Record<PlaceId, RawEntry> = {};
  for (const [placeId, entry] of Object.entries(data)) {
    if (entry.coord) {
      result[placeId] = entry;
      continue;
    }
    const longLat = await getLongLat(
      entry.place,
      entry.state,
      entry.country,
      geocoder,
    );
    if (!longLat) throw new Error(`Could not get lat long for ${placeId}`);
    result[placeId] = { ...entry, coord: longLat };
  }
  return result;
}

// -------------------------------------------------------------
// Main
// -------------------------------------------------------------

async function main(): Promise<void> {
  const [cityData, reportData, coreData] = await Promise.all([
    readCityTable(),
    readReportTable(),
    readCoreData(),
  ]);
  const mergedTableData = join(reportData, cityData);
  const cached = addCachedLatLng(mergedTableData, coreData);
  const withLatLng = await addMissingLatLng(cached);
  await saveCoreData(withLatLng);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
