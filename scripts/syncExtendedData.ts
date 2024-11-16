/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs/promises";

import fetch from "node-fetch";
import { DateTime } from "luxon";

import { parseCsv } from "./lib/csv";
import {
  Attachment as AttachmentBase,
  Citation as CitationBase,
  splitStringArray,
} from "./lib/data";
import { escapePlaceId } from "../src/js/data";

type Attachment = AttachmentBase & { url: string };
export type Citation = CitationBase & {
  idx: number;
  lastUpdated: DateTime<true>;
  attachments: Attachment[];
};

type PlaceEntry = {
  requirements: string | null;
  reporter: string | null;
  citations: Citation[];
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

async function fetchGTablesData(): Promise<Record<string, any>[]> {
  const response = await fetch(
    "https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc",
    {
      headers: { "User-Agent": "prn-update-city-details" },
    },
  );
  const rawData = await response.text();
  return parseCsv(rawData);
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
      outputPath: `attachment_images/${escapePlaceId(placeId)}_${citationIdx}_${
        j + 1
      }${fileType}`,
    };
  });
}

async function loadData(): Promise<Record<string, PlaceEntry>> {
  // Google Tables stores one row per citation. A place may have >1 citation,
  // but they share the same PlaceEntry data otherwise.
  const gTablesData = await fetchGTablesData();

  const result: Record<string, PlaceEntry> = {};
  gTablesData.forEach((row) => {
    if (!row.City) return;

    const placeId = row.State ? `${row.City}, ${row.State}` : row.City;
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
      requirements: row.Requirements,
      reporter: row.Reporter,
      citations: [citation],
    };
  });

  return result;
}

export function citationsUpdated(
  citations: Citation[],
  globalLastUpdated: DateTime<true>,
): boolean {
  const maxLastUpdated = DateTime.max(...citations.map((x) => x.lastUpdated));
  return maxLastUpdated >= globalLastUpdated;
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

async function ensureDownloads(
  placeId: string,
  entry: PlaceEntry,
  globalLastUpdated: DateTime<true>,
): Promise<void> {
  if (!citationsUpdated(entry.citations, globalLastUpdated)) return;
  console.log(`Updating citation downloads: ${placeId}`);
  await setupAttachmentDownloads(
    entry.citations.flatMap((citation) => citation.attachments),
  );
}

async function updateLastUpdatedFile(): Promise<void> {
  console.log(
    `Updating ${GLOBAL_LAST_UPDATED_FP} with today's date and time zone`,
  );
  const currentDatetime = DateTime.local().setZone("UTC");
  const formatted = currentDatetime.toFormat(TIME_FORMAT);
  await fs.writeFile(GLOBAL_LAST_UPDATED_FP, formatted);
}

async function saveExtendedDataFile(
  data: Record<string, PlaceEntry>,
): Promise<void> {
  const prunedData = Object.fromEntries(
    Object.entries(data)
      .map(([placeId, entry]) => {
        const citations = entry.citations.map((citation) => ({
          description: citation.description,
          type: citation.type?.toLowerCase(),
          url: citation.url,
          notes: citation.notes ? citation.notes.toString() : citation.notes,
          attachments: citation.attachments.map((attachment) => ({
            fileName: attachment.fileName,
            isDoc: attachment.isDoc,
            outputPath: attachment.outputPath,
          })),
        }));
        const requirements = splitStringArray(entry.requirements || "", {
          adu: "accessory dwelling units",
          tdm: "transportation demand management",
          "in lieu fees": "in-lieu fees",
          "car share": "carshare",
        });
        return [
          placeId,
          {
            reporter: entry.reporter,
            requirements,
            citations,
          },
        ];
      })
      .sort(),
  );
  const json = JSON.stringify(prunedData, null, 2);

  console.log(`Updating data/extended.json`);
  await fs.writeFile("data/extended.json", json);
}

async function main(): Promise<void> {
  const [rawGlobalLastUpdated, data] = await Promise.all([
    fs.readFile(GLOBAL_LAST_UPDATED_FP, "utf-8"),
    loadData(),
  ]);
  const globalLastUpdated = parseDatetime(rawGlobalLastUpdated, false);

  // Use await in a for loop to avoid making too many calls -> rate limiting.
  for (const [placeId, entry] of Object.entries(data)) {
    await ensureDownloads(placeId, entry, globalLastUpdated);
  }

  await saveExtendedDataFile(data);
  await updateLastUpdatedFile();
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
