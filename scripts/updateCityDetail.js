/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";

import fetch from "node-fetch";
import Papa from "papaparse";
import Handlebars from "handlebars";
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
    "https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc",
    {
      headers: { "User-Agent": "prn-update-city-details" },
    }
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

/**
 Rewrite the entries' attachments field to a normalized object.
 */
const normalizeAttachments = (cityEntries, cityStateNoSpace) => {
  cityEntries.forEach((entry, i) => {
    if (!entry.Attachments) {
      entry.Attachments = []; // eslint-disable-line no-param-reassign
      return;
    }
    const attachments = entry.Attachments.split(/\s+/);
    // eslint-disable-next-line no-param-reassign
    entry.Attachments = attachments.map((val, j) => {
      const fileType = val.match(/\.[a-zA-Z_]+$/)[0];
      return {
        url: val,
        fileName: new URL(val).pathname.split("/").pop(),
        isDoc: fileType === ".docx" || fileType === ".pdf",
        outputPath: `attachment_images/${cityStateNoSpace}_${i + 1}_${
          j + 1
        }${fileType}`,
      };
    });
  });
};

const setupAttachmentDownloads = async (cityEntries) => {
  // Use await in a for loop to avoid making too many calls -> rate limiting.
  for (const entry of cityEntries) {
    for (const attachment of entry.Attachments) {
      const response = await fetch(attachment.url, {
        headers: { "User-Agent": "prn-update-city-detail" },
      });
      const buffer = await response.arrayBuffer();
      await fs.writeFile(
        `city_detail/${attachment.outputPath}`,
        Buffer.from(buffer)
      );
    }
  }
};

const renderHandlebars = (cityEntries, template) => {
  const citations = cityEntries.map((entry, i) => ({
    idx: i + 1,
    sourceDescription: entry["Source Description"],
    type: entry.Type,
    notes: entry.Notes,
    url: entry.URL,
    attachments: entry.Attachments,
  }));
  const entry0 = cityEntries[0];
  return template({
    city: entry0.City,
    state: entry0.State ? `, ${entry0.State}` : "",
    summary: entry0.Summary,
    status: entry0.Status,
    reformType: entry0["Reform Type"],
    uses: entry0.Uses,
    magnitude: entry0.Magnitude,
    requirements: entry0.Requirements,
    reporter: entry0.Reporter,
    citations,
  });
};

const processCity = async (cityState, entries, template, globalLastUpdated) => {
  if (!needsUpdate(entries, globalLastUpdated)) {
    console.log(`Skipping ${cityState}`);
    return;
  }

  console.log(`Updating ${cityState}`);

  const cityStateNoSpace = cityState.replace(/ /g, "");
  normalizeAttachments(entries, cityStateNoSpace);
  await setupAttachmentDownloads(entries);
  await fs.writeFile(
    `city_detail/${cityStateNoSpace}.html`,
    renderHandlebars(entries, template)
  );
};

const updateLastUpdatedFile = async () => {
  console.log(
    `Updating ${GLOBAL_LAST_UPDATED_FP} with today's date and time zone`
  );
  const currentDatetime = DateTime.local().setZone("local");
  const formatted = currentDatetime.toFormat(TIME_FORMAT);
  await fs.writeFile(GLOBAL_LAST_UPDATED_FP, formatted);
};

const main = async () => {
  const [rawGlobalLastUpdated, rawTemplate, data] = await Promise.all([
    fs.readFile(GLOBAL_LAST_UPDATED_FP, "utf-8"),
    fs.readFile("scripts/city_detail.html.handlebars", "utf-8"),
    fetchData(),
  ]);
  const template = Handlebars.compile(rawTemplate);
  const globalLastUpdated = parseDatetime(rawGlobalLastUpdated, false);

  const cityStateMap = {};
  data.forEach((row) => {
    if (!row.City) return;
    const cityState = row.State ? `${row.City}_${row.State}` : row.City;
    if (!cityStateMap[cityState]) {
      cityStateMap[cityState] = [];
    }
    cityStateMap[cityState].push(row);
  });

  // Use await in a for loop to avoid making too many calls -> rate limiting.
  for (const [cityState, entries] of Object.entries(cityStateMap)) {
    await processCity(cityState, entries, template, globalLastUpdated);
  }

  await updateLastUpdatedFile();
};

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { needsUpdate, normalizeAttachments, parseDatetime };
