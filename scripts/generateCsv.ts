/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */

import fs from "fs/promises";

import Papa from "papaparse";

import { readCompleteData } from "./lib/data";

function assertExpectedNumEntries(jsonKeys: string[], csv: string): void {
  const numJson = jsonKeys.length;
  const numCsv = csv.split("\r\n").length - 1;
  if (numJson !== numCsv) {
    throw new Error(`CSV has unequal entries to JSON: ${numCsv} vs ${numJson}`);
  }
}

async function main(): Promise<void> {
  const completeData = await readCompleteData();
  const data = Object.values(completeData).map((row) => ({
    place: row.place,
    state: row.state,
    country: row.country,
    all_minimums_repealed: row.repeal ? "TRUE" : "FALSE",
    status: row.status,
    policy_change: row.policy,
    scope: row.scope,
    land_uses: row.land,
    reform_date: row.date,
    population: row.pop,
    lat: row.coord[0],
    long: row.coord[1],
    url: row.url,
    reporter: row.reporter,
    summary: row.summary,
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
