/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
import fs from "fs/promises";

import fetch from "node-fetch";
import Papa from "papaparse";
import { DateTime } from "luxon";

const GLOBAL_LAST_UPDATED_FP = "scripts/city_detail_last_updated.txt";
const TIME_FORMAT = "MMMM d, yyyy, h:mm:ss a z";
// Luxon does not support abbreviations like EST because they are not standardized:
//   https://moment.github.io/luxon/#/zones?id=luxon-works-with-time-zones
const TIME_ZONE_MAPPING = {
  PDT: "America/Los_Angeles",
  PST: "America/Los_Angeles",
};

const parseDatetime = (val, timeZoneAbbreviations = true) => {
  let cleanedVal = val.replace(/\u202F/g, " ");
  if (timeZoneAbbreviations) {
    const tzAbbreviation = cleanedVal.split(" ").pop();
    const tz = TIME_ZONE_MAPPING[tzAbbreviation];
    cleanedVal = cleanedVal.replace(tzAbbreviation, tz);
  }
  const result = DateTime.fromFormat(cleanedVal, TIME_FORMAT);
  if (result.invalid) {
    throw new Error(`Could not parse ${val}: ${result.invalidExplanation}`);
  }
  return result;
};

const fetchData = async () => {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc"
  );
  const rawData = await response.text();
  return Papa.parse(rawData, { header: true }).data;
};

const needsUpdate = (cityEntries, globalLastUpdated) => {
  const lastUpdatedDates = cityEntries.map((row) =>
    parseDatetime(row["Last updated"])
  );
  const reportLastUpdated = parseDatetime(
    cityEntries[0]["Report Last updated"]
  );
  const cityLastUpdated = parseDatetime(cityEntries[0]["City Last Updated"]);
  const maxLastUpdated = DateTime.max(
    ...lastUpdatedDates,
    reportLastUpdated,
    cityLastUpdated
  );
  return maxLastUpdated >= globalLastUpdated;
};

const processCity = (cityState, entries, globalLastUpdated) => {
  if (!needsUpdate(entries, globalLastUpdated)) {
    console.log(`Skipping ${cityState}`);
    return;
  }

  console.log(`Updating ${cityState}`);
};

const updateLastUpdatedFile = async () => {
  console.log(
    `Updating ${GLOBAL_LAST_UPDATED_FP} with today's date and time zone`
  );
  const currentDatetime = DateTime.local().setZone("local");
  const formatted = currentDatetime.toFormat(TIME_FORMAT);
  await fs.writeFile(GLOBAL_LAST_UPDATED_FP, formatted, "utf-8");
};

const updateCities = async () => {
  const [rawGlobalLastUpdated, data] = await Promise.all([
    fs.readFile(GLOBAL_LAST_UPDATED_FP, "utf-8"),
    fetchData(),
  ]);
  const globalLastUpdated = parseDatetime(rawGlobalLastUpdated, false);

  const cityStateMap = {};
  data.forEach((row) => {
    if (!row.City || !row.State) {
      return;
    }
    const cityState = `${row.City}_${row.State}`;
    if (!cityStateMap[cityState]) {
      cityStateMap[cityState] = [];
    }
    cityStateMap[cityState].push(row);
  });

  Object.entries(cityStateMap).forEach(([cityState, entries]) =>
    processCity(cityState, entries, globalLastUpdated)
  );

  await updateLastUpdatedFile();
};

if (process.env.NODE_ENV !== "test") {
  updateCities().catch((error) => console.error(error));
}

export { needsUpdate, parseDatetime };
