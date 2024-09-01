import fs from "fs/promises";

import Papa from "papaparse";

import { readCompleteData } from "./lib/data";

async function main(): Promise<void> {
  const completeData = await readCompleteData();
  const data = Object.values(completeData).map((row) => {
    return {
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
    };
  });
  const csv = Papa.unparse(Object.values(data));
  await fs.writeFile("data/data.csv", csv);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
