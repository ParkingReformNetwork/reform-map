/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs/promises";

import fetch from "node-fetch";

import { PlaceId } from "../src/js/types";
import { parseCsv } from "./lib/csv";
import {
  Attachment as AttachmentBase,
  Citation as CitationBase,
  splitStringArray,
} from "./lib/data";
import { escapePlaceId } from "../src/js/data";
import {
  DirectusClient,
  getUploadedFiles,
  initDirectus,
  uploadFile,
} from "./lib/directus";

type Attachment = AttachmentBase & { url: string };
export type Citation = CitationBase & {
  idx: number;
  attachments: Attachment[];
};

type PlaceEntry = {
  requirements: string | null;
  reporter: string | null;
  citations: Citation[];
};

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
    const fileType = val
      .split(".")
      .at(-1)
      ?.toLowerCase()
      ?.replace("jpg_medium", "jpg");
    if (!fileType) throw new Error(`Missing file extension in ${val}`);
    const expectedFileTypes = new Set(["jpg", "png", "docx", "pdf"]);
    if (!expectedFileTypes.has(fileType)) {
      throw new Error(
        `Unexpected file type for ${placeId} attachment ${val}: ${fileType}`,
      );
    }

    const fileName = `${escapePlaceId(placeId)}_${citationIdx}_${
      j + 1
    }.${fileType}`;
    return {
      url: val,
      fileName,
      isDoc: fileType === "docx" || fileType === "pdf",
      directusId: "TODO",
    };
  });
}

async function loadData(): Promise<Record<PlaceId, PlaceEntry>> {
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

async function ensureDownloads(
  entry: PlaceEntry,
  directusClient: DirectusClient,
  fileNameToDirectusIds: Record<string, string>,
): Promise<void> {
  // Use a for loop to avoid making too many calls -> rate limiting.
  for (const citation of entry.citations) {
    for (const attachment of citation.attachments) {
      if (attachment.fileName in fileNameToDirectusIds) continue;

      console.log(`Uploading to Directus: ${attachment.fileName}`);
      const response = await fetch(attachment.url, {
        headers: { "User-Agent": "prn-update-city-detail" },
      });
      const blob = await response.buffer();
      const directusId = await uploadFile(
        directusClient,
        attachment.fileName,
        blob,
      );
      // eslint-disable-next-line no-param-reassign
      fileNameToDirectusIds[attachment.fileName] = directusId;
    }
  }
}

async function saveExtendedDataFile(
  data: Record<string, PlaceEntry>,
  fileNameToDirectusIds: Record<string, string>,
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
            directusId: fileNameToDirectusIds[attachment.fileName],
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
  const data = await loadData();

  const directusClient = await initDirectus();
  const fileNameToDirectusIds = await getUploadedFiles(directusClient);

  // Use a for loop to avoid making too many calls -> rate limiting.
  for (const entry of Object.values(data)) {
    await ensureDownloads(entry, directusClient, fileNameToDirectusIds);
  }

  await saveExtendedDataFile(data, fileNameToDirectusIds);
  process.exit(0);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
