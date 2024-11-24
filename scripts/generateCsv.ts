/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

import fs from "fs/promises";

import Papa from "papaparse";

import { readCompleteData } from "./lib/data";
import { placeIdToUrl } from "../src/js/data";

function assertExpectedNumEntries(jsonKeys: string[], csv: string): void {
  const numJson = jsonKeys.length;
  const numCsv = csv.split("\r\n").length - 1;
  if (numJson !== numCsv) {
    throw new Error(`CSV has unequal entries to JSON: ${numCsv} vs ${numJson}`);
  }
}

async function main(): Promise<void> {
  const completeData = await readCompleteData();
  const data = Object.entries(completeData).map(([placeId, entry]) => ({
    place: entry.place.name,
    state: entry.place.state,
    country: entry.place.country,
    all_minimums_repealed: entry.place.repeal ? "TRUE" : "FALSE",
    status: entry.legacy.status,
    policy_change: entry.legacy.policy,
    scope: entry.legacy.scope,
    land_uses: entry.legacy.land,
    reform_date: entry.legacy.date,
    population: entry.place.pop,
    lat: entry.place.coord[1],
    long: entry.place.coord[0],
    url: placeIdToUrl(placeId),
    reporter: entry.legacy.reporter,
    summary: entry.legacy.summary,
  }));
  const csv = Papa.unparse(Object.values(data));
  assertExpectedNumEntries(Object.keys(completeData), csv);
  await fs.writeFile("data/data.csv", csv);
  console.log("Generated CSV at data/data.csv");

  // Also save to map/data.csv for now, until data/data.csv can be deployed to the PRN site.
  await fs.writeFile("map/data.csv", csv);
  console.log("Generated CSV at map/data.csv");
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
