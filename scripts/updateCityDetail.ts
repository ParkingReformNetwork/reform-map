/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";

import fetch from "node-fetch";
import Papa from "papaparse";
import Handlebars from "handlebars";
import { DateTime } from "luxon";

export type PlaceEntry = {
  summary: string;
  status: string;
  policyChange: string;
  landUse: string;
  scope: string;
  requirements: string;
  reporter: string;
  reportLastUpdated: DateTime<true>;
  cityLastUpdated: DateTime<true>;
  citations: Citation[];
};

type Citation = {
  idx: number;
  description: string;
  type: string;
  url: string;
  notes: string;
  lastUpdated: DateTime<true>;
  attachments: Attachment[];
};

type Attachment = {
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

function rmSpace(v: string): string {
  return v.replace(/ /g, "");
}

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

async function fetchGTablesData(): Promise<Record<string, any>[]> {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc",
    {
      headers: { "User-Agent": "prn-update-city-details" },
    },
  );
  const rawData = await response.text();
  return Papa.parse(rawData, { header: true }).data as Record<string, any>[];
}

async function loadData(): Promise<Record<string, PlaceEntry>> {
  // Google Tables stores one row per citation. A place may have >1 citation,
  // but they share the same PlaceEntry data otherwise.
  const gTablesData = await fetchGTablesData();

  const result: Record<string, PlaceEntry> = {};
  gTablesData.forEach((row) => {
    if (!row.City) return;

    const placeId = row.State ? `${row.City}_${row.State}` : row.City;
    const citationIdx = result[placeId]
      ? result[placeId].citations.length + 1
      : 1;

    const citation = {
      idx: citationIdx,
      description: row["Source Description"],
      type: row.Type,
      url: row.URL,
      notes: row.Notes,
      lastUpdated: parseDatetime(row["Last updated"]),
      attachments: normalizeAttachments(row.Attachments, citationIdx, placeId),
    };

    if (result[placeId]) {
      result[placeId].citations.push(citation);
      return;
    }

    result[placeId] = {
      summary: row.Summary,
      status: row.Status,
      policyChange: row["Reform Type"],
      landUse: row.Uses,
      scope: row.Magnitude,
      requirements: row.Requirements,
      reporter: row.Reporter,
      reportLastUpdated: parseDatetime(row["Report Last updated"]),
      cityLastUpdated: parseDatetime(row["City Last Updated"]),
      citations: [citation],
    };
  });

  return result;
}

export function needsUpdate(
  entry: PlaceEntry,
  globalLastUpdated: DateTime<true>,
): boolean {
  const maxLastUpdated = DateTime.max(
    ...entry.citations.map((x) => x.lastUpdated),
    entry.reportLastUpdated,
    entry.cityLastUpdated,
  );
  return maxLastUpdated >= globalLastUpdated;
}

/**
 Rewrite the entries' attachments field to a normalized object.
 */
export function normalizeAttachments(
  attachments: string,
  citationIdx: number,
  placeId: string,
): Attachment[] {
  if (!attachments) {
    return [];
  }
  return attachments.split(/\s+/).map((val, j) => {
    const fileTypeMatch = val.match(/\.[a-zA-Z_]+$/);
    const fileType = fileTypeMatch ? fileTypeMatch[0] : null;
    return {
      url: val,
      fileName: new URL(val).pathname.split("/").pop()!,
      isDoc: fileType === ".docx" || fileType === ".pdf",
      outputPath: `attachment_images/${rmSpace(placeId)}_${citationIdx}_${
        j + 1
      }${fileType}`,
    };
  });
}

async function setupAttachmentDownloads(
  attachments: Attachment[],
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
  placeId: string,
  entry: PlaceEntry,
  template: HandlebarsTemplateDelegate,
): string {
  return template({
    placeId,
    summary: entry.summary,
    status: entry.status,
    reformType: entry.policyChange,
    landUse: entry.landUse,
    scope: entry.scope,
    requirements: entry.requirements,
    reporter: entry.reporter,
    citations: entry.citations,
  });
}

async function processPlace(
  placeId: string,
  entry: PlaceEntry,
  template: HandlebarsTemplateDelegate,
  globalLastUpdated: DateTime<true>,
): Promise<void> {
  if (!needsUpdate(entry, globalLastUpdated)) {
    console.log(`Skipping ${placeId}`);
    return;
  }

  console.log(`Updating ${placeId}`);

  await setupAttachmentDownloads(
    entry.citations.flatMap((citation) => citation.attachments),
  );
  await fs.writeFile(
    `city_detail/${rmSpace(placeId)}.html`,
    renderHandlebars(placeId, entry, template),
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
    loadData(),
  ]);
  const template = Handlebars.compile(rawTemplate);
  const globalLastUpdated = parseDatetime(rawGlobalLastUpdated, false);

  // Use await in a for loop to avoid making too many calls -> rate limiting.
  for (const [placeId, entry] of Object.entries(data)) {
    await processPlace(placeId, entry, template, globalLastUpdated);
  }

  await updateLastUpdatedFile();
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
