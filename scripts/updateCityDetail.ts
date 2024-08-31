/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";

import fetch from "node-fetch";
import Papa from "papaparse";
import Handlebars from "handlebars";
import { DateTime } from "luxon";

export type PlaceEntry = {
  City: string;
  State: string;
  Summary: string;
  "Verified By": string;
  "Source Description": string;
  Type: string;
  URL: string;
  Notes: string;
  Attachments: string;
  "Last updated": string;
  "Create Time": string;
  Status: string;
  Uses: string;
  "Reform Type": string;
  Magnitude: string;
  Requirements: string;
  Reporter: string;
  "Report Last updated": string;
  "City Last Updated": string;
  CitationID: string;
};

type NormalizedAttachment = {
  url: string;
  fileName: string;
  isDoc: boolean;
  outputPath: string;
};

const GLOBAL_LAST_UPDATED_FP = "scripts/city_detail_last_updated.txt";
const TIME_FORMAT = "MMMM d, yyyy, h:mm:ss a z";
// Luxon does not support abbreviations like EST because they are not standardized:
//   https://moment.github.io/luxon/#/zones?id=luxon-works-with-time-zones
const TIME_ZONE_MAPPING: Partial<Record<string, string>> = {
  PDT: "America/Los_Angeles",
  PST: "America/Los_Angeles",
};

export function parseDatetime(
  val: string,
  timeZoneAbbreviations: boolean = true,
): DateTime<true> {
  let cleanedVal = val.replace(/\u202F/g, " ");
  if (timeZoneAbbreviations) {
    const tzAbbreviation = cleanedVal.split(" ").pop();
    if (!tzAbbreviation) throw new Error(`Missing time zone: ${val}`);
    const tz = TIME_ZONE_MAPPING[tzAbbreviation];
    if (!tz) throw new Error(`Unrecognized time zone: ${tzAbbreviation}`);
    cleanedVal = cleanedVal.replace(tzAbbreviation, tz);
  }
  const result = DateTime.fromFormat(cleanedVal, TIME_FORMAT);
  if (!result.isValid) {
    throw new Error(`Could not parse ${val}: ${result.invalidExplanation}`);
  }
  return result;
}

async function fetchData(): Promise<PlaceEntry[]> {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc",
    {
      headers: { "User-Agent": "prn-update-city-details" },
    },
  );
  const rawData = await response.text();
  return Papa.parse(rawData, { header: true }).data as PlaceEntry[];
}

export function needsUpdate(
  placeEntries: PlaceEntry[],
  globalLastUpdated: DateTime<true>,
): boolean {
  const lastUpdatedDates = placeEntries.map((row) =>
    parseDatetime(row["Last updated"]),
  );
  const reportLastUpdated = parseDatetime(
    placeEntries[0]["Report Last updated"],
  );
  const cityLastUpdated = parseDatetime(placeEntries[0]["City Last Updated"]);
  const maxLastUpdated = DateTime.max(
    ...lastUpdatedDates,
    reportLastUpdated,
    cityLastUpdated,
  );
  return maxLastUpdated >= globalLastUpdated;
}

/**
 Rewrite the entries' attachments field to a normalized object.
 */
export function normalizeAttachments(
  placeEntries: PlaceEntry[],
  placeIdNoSpace: string,
): NormalizedAttachment[] {
  return placeEntries.reduce(
    (result: NormalizedAttachment[], entry: PlaceEntry, i: number) => {
      if (!entry.Attachments) {
        return result;
      }
      const attachments = entry.Attachments.split(/\s+/).map((val, j) => {
        const fileTypeMatch = val.match(/\.[a-zA-Z_]+$/);
        const fileType = fileTypeMatch ? fileTypeMatch[0] : null;
        return {
          url: val,
          fileName: new URL(val).pathname.split("/").pop()!,
          isDoc: fileType === ".docx" || fileType === ".pdf",
          outputPath: `attachment_images/${placeIdNoSpace}_${i + 1}_${
            j + 1
          }${fileType}`,
        };
      });
      return [...result, ...attachments];
    },
    [],
  );
}

async function setupAttachmentDownloads(
  attachments: NormalizedAttachment[],
): Promise<void> {
  // Use await in a for loop to avoid making too many calls -> rate limiting.
  for (const attachment of attachments) {
    const response = await fetch(attachment.url, {
      headers: { "User-Agent": "prn-update-city-detail" },
    });
    const buffer = await response.arrayBuffer();
    await fs.writeFile(
      `city_detail/${attachment.outputPath}`,
      Buffer.from(buffer),
    );
  }
}

function renderHandlebars(
  placeEntries: PlaceEntry[],
  template: HandlebarsTemplateDelegate,
): string {
  const citations = placeEntries.map((entry, i) => ({
    idx: i + 1,
    sourceDescription: entry["Source Description"],
    type: entry.Type,
    notes: entry.Notes,
    url: entry.URL,
    attachments: entry.Attachments,
  }));
  // The entries duplicate a lot of cells, so it's safe to simply look at the first
  // entry to get the following information.
  const entry0 = placeEntries[0];
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
}

async function processPlace(
  placeId: string,
  placeEntries: PlaceEntry[],
  template: HandlebarsTemplateDelegate,
  globalLastUpdated: DateTime<true>,
): Promise<void> {
  if (!needsUpdate(placeEntries, globalLastUpdated)) {
    console.log(`Skipping ${placeId}`);
    return;
  }

  console.log(`Updating ${placeId}`);

  const placeIdNoSpace = placeId.replace(/ /g, "");
  const attachments = normalizeAttachments(placeEntries, placeIdNoSpace);
  await setupAttachmentDownloads(attachments);
  await fs.writeFile(
    `city_detail/${placeIdNoSpace}.html`,
    renderHandlebars(placeEntries, template),
  );
}

async function updateLastUpdatedFile(): Promise<void> {
  console.log(
    `Updating ${GLOBAL_LAST_UPDATED_FP} with today's date and time zone`,
  );
  const currentDatetime = DateTime.local().setZone("local");
  const formatted = currentDatetime.toFormat(TIME_FORMAT);
  await fs.writeFile(GLOBAL_LAST_UPDATED_FP, formatted);
}

async function main(): Promise<void> {
  const [rawGlobalLastUpdated, rawTemplate, data] = await Promise.all([
    fs.readFile(GLOBAL_LAST_UPDATED_FP, "utf-8"),
    fs.readFile("scripts/city_detail.html.handlebars", "utf-8"),
    fetchData(),
  ]);
  const template = Handlebars.compile(rawTemplate);
  const globalLastUpdated = parseDatetime(rawGlobalLastUpdated, false);

  // A place will have one entry per citation.
  const entriesByPlaceId: Record<string, PlaceEntry[]> = {};
  data.forEach((row) => {
    if (!row.City) return;
    const placeId = row.State ? `${row.City}_${row.State}` : row.City;
    if (!entriesByPlaceId[placeId]) {
      entriesByPlaceId[placeId] = [];
    }
    entriesByPlaceId[placeId].push(row);
  });

  // Use await in a for loop to avoid making too many calls -> rate limiting.
  for (const [placeId, placeEntries] of Object.entries(entriesByPlaceId)) {
    await processPlace(placeId, placeEntries, template, globalLastUpdated);
  }

  await updateLastUpdatedFile();
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
