/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";

import { readItems, readFiles, updateItem } from "@directus/sdk";
import NodeGeocoder from "node-geocoder";

import {
  initDirectus,
  DirectusClient,
  Place as DirectusPlace,
  LegacyReform,
  Citation as DirectusCitation,
  CITATIONS_FILES_FOLDER,
} from "./lib/directus";
import { PlaceId as PlaceStringId } from "../src/js/types";
import { getLongLat, initGeocoder } from "./lib/geocoder";
import { Attachment, Citation, CompleteEntry } from "./lib/data";
import { escapePlaceId } from "../src/js/data";

// --------------------------------------------------------------------------
// Read Directus
// --------------------------------------------------------------------------

async function readPlacesAndEnsureCoordinates(
  client: DirectusClient,
  geocoder: NodeGeocoder.Geocoder,
): Promise<{
  directusIdToStringId: Record<number, PlaceStringId>;
  stringIdToPlace: Record<PlaceStringId, Partial<DirectusPlace>>;
}> {
  const records = await client.request(
    readItems("places", {
      fields: [
        "id",
        "name",
        "state",
        "country_code",
        "population",
        "coordinates",
      ],
      limit: -1,
    }),
  );
  const directusIdToStringId: Record<number, PlaceStringId> = {};
  const stringIdToPlace: Record<PlaceStringId, Partial<DirectusPlace>> = {};
  for (const record of records) {
    const stringId = record.state
      ? `${record.name}, ${record.state}`
      : record.name;

    if (!record.coordinates) {
      console.log(`Getting coordinates for ${stringId}`);
      const longLat = await getLongLat(
        record.name,
        record.state,
        record.country_code,
        geocoder,
      );
      if (!longLat) {
        throw new Error(
          `Failed to get coordinates for ${stringId} (place ID ${record.id}). You can manually add the coordinates to Directus and try the sync again.`,
        );
      }
      const coordinates = { type: "Point" as const, coordinates: longLat };
      record.coordinates = coordinates;
      await client.request(
        updateItem("places", record.id, {
          coordinates,
        }),
      );
    }

    directusIdToStringId[record.id] = stringId;
    stringIdToPlace[stringId] = record;
  }
  return {
    directusIdToStringId,
    stringIdToPlace,
  };
}

async function readLegacyReforms(
  client: DirectusClient,
  placeDirectusIdToStringId: Record<number, PlaceStringId>,
): Promise<Record<PlaceStringId, Partial<LegacyReform>>> {
  const records = await client.request(
    readItems("legacy_reforms", {
      fields: [
        "id",
        "place",
        "policy_changes",
        "land_uses",
        "reform_scope",
        "requirements",
        "status",
        "summary",
        "reporter",
        "reform_date",
        "complete_minimums_repeal",
        "citations",
      ],
      limit: -1,
    }),
  );
  return Object.fromEntries(
    records.map((record) => [placeDirectusIdToStringId[record.place], record]),
  );
}

async function readCitationsByLegacyReformJunctionId(
  client: DirectusClient,
): Promise<Record<number, Partial<DirectusCitation>>> {
  const rawCitations = await client.request(
    readItems("citations", {
      fields: [
        "id",
        "type",
        "source_description",
        "notes",
        "url",
        "attachments",
      ],
      limit: -1,
    }),
  );
  const citations = Object.fromEntries(
    rawCitations.map((record) => [record.id, record]),
  );
  const junctionRecords = await client.request(
    readItems("legacy_reforms_citations", {
      fields: ["id", "citations_id"],
      limit: -1,
    }),
  );
  const citationIdsByJunctionIds = Object.fromEntries(
    junctionRecords.map((record) => [record.id, record.citations_id]),
  );
  return Object.fromEntries(
    Object.entries(citationIdsByJunctionIds).map(([junctionId, citationId]) => [
      junctionId,
      citations[citationId],
    ]),
  );
}

interface FileMetadata {
  id: string;
  mimeType: string | null;
}

async function readFilesByAttachmentJunctionId(
  client: DirectusClient,
): Promise<Record<number, FileMetadata>> {
  const rawFiles = await client.request(
    readFiles({
      filter: { folder: { _eq: CITATIONS_FILES_FOLDER } },
      fields: ["id", "type"],
      limit: -1,
    }),
  );
  const fileTypesById = Object.fromEntries(
    rawFiles.map((record) => [record.id, record.type]),
  );

  const rawCitationFileJunctions = await client.request(
    readItems("citations_files", {
      fields: ["id", "directus_files_id"],
      limit: -1,
    }),
  );
  const fileIdsByCitationJunctionId = Object.fromEntries(
    rawCitationFileJunctions.map((record) => [
      record.id,
      record.directus_files_id,
    ]),
  );

  return Object.fromEntries(
    Object.entries(fileIdsByCitationJunctionId).map(([junctionId, fileId]) => [
      junctionId,
      { id: fileId, mimeType: fileTypesById[fileId] },
    ]),
  );
}

// --------------------------------------------------------------------------
// Combine data
// --------------------------------------------------------------------------

function mimeTypeToFileExtension(metadata: FileMetadata): string {
  if (!metadata.mimeType) {
    throw new Error(`Missing mime type for file ID ${metadata.id}`);
  }
  const result = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/pdf": "pdf",
  }[metadata.mimeType];
  if (!result) {
    throw new Error(
      `Unrecognized mime type ${metadata.mimeType} for file ${metadata.id}`,
    );
  }
  return result;
}

function createAttachments(
  filesByAttachmentJunctionId: Record<number, FileMetadata>,
  attachmentJunctionIds: number[],
  placeId: string,
  citationIdx: number,
): Attachment[] {
  return attachmentJunctionIds.map((attachmentJunctionId, attachmentIdx) => {
    const fileMetadata = filesByAttachmentJunctionId[attachmentJunctionId];
    const fileExtension = mimeTypeToFileExtension(fileMetadata);
    const fileName = `${escapePlaceId(placeId)}_${citationIdx + 1}_${attachmentIdx + 1}.${fileExtension}`;
    return {
      fileName,
      isDoc: fileExtension === "pdf" || fileExtension === "docx",
      directusId: fileMetadata.id,
    };
  });
}

function combineData(
  places: Record<PlaceStringId, Partial<DirectusPlace>>,
  legacyReforms: Record<PlaceStringId, Partial<LegacyReform>>,
  citationsByLegacyReformJunctionId: Record<number, Partial<DirectusCitation>>,
  filesByAttachmentJunctionId: Record<number, FileMetadata>,
): Record<PlaceStringId, CompleteEntry> {
  return Object.fromEntries(
    Object.entries(places)
      .map(([placeId, place]) => {
        const reform = legacyReforms[placeId];
        const citations = reform.citations!.map(
          (junctionId, citationIdx): Citation => {
            const citationRecord =
              citationsByLegacyReformJunctionId[junctionId];
            const attachments = createAttachments(
              filesByAttachmentJunctionId,
              citationRecord.attachments!,
              placeId,
              citationIdx,
            );
            return {
              description: citationRecord.source_description!,
              type: citationRecord.type!,
              url: citationRecord.url!,
              notes: citationRecord.notes!,
              attachments,
            };
          },
        );
        const result = {
          place: place.name!,
          state: place.state!,
          country: place.country_code!,
          pop: place.population!,
          coord: place.coordinates!.coordinates,
          summary: reform.summary!,
          status: reform.status!,
          policy: reform.policy_changes!,
          scope: reform.reform_scope!,
          land: reform.land_uses!,
          repeal: reform.complete_minimums_repeal!,
          date: reform.reform_date!,
          reporter: reform.reporter!,
          requirements: reform.requirements!,
          citations,
        };
        return [placeId, result];
      })
      .sort(),
  );
}

// --------------------------------------------------------------------------
// Save results
// --------------------------------------------------------------------------

async function saveCoreData(
  result: Record<PlaceStringId, CompleteEntry>,
): Promise<void> {
  const pruned = Object.fromEntries(
    Object.entries(result).map(([placeId, entry]) => [
      placeId,
      {
        place: entry.place,
        state: entry.state,
        country: entry.country,
        summary: entry.summary,
        status: entry.status,
        policy: entry.policy,
        scope: entry.scope,
        land: entry.land,
        date: entry.date,
        repeal: entry.repeal,
        pop: entry.pop,
        coord: entry.coord,
      },
    ]),
  );
  const json = JSON.stringify(pruned, null, 2);
  console.log("Writing data/core.json");
  await fs.writeFile("data/core.json", json);
}

async function saveExtendedData(
  result: Record<PlaceStringId, CompleteEntry>,
): Promise<void> {
  const pruned = Object.fromEntries(
    Object.entries(result).map(([placeId, entry]) => [
      placeId,
      {
        reporter: entry.reporter,
        requirements: entry.requirements,
        citations: entry.citations,
      },
    ]),
  );
  const json = JSON.stringify(pruned, null, 2);
  console.log("Writing data/extended.json");
  await fs.writeFile("data/extended.json", json);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main(): Promise<void> {
  const client = await initDirectus();
  const geocoder = initGeocoder();

  const places = await readPlacesAndEnsureCoordinates(client, geocoder);
  const legacyReforms = await readLegacyReforms(
    client,
    places.directusIdToStringId,
  );
  const citationsByLegacyReformJunctionId =
    await readCitationsByLegacyReformJunctionId(client);
  const filesByAttachmentJunctionId =
    await readFilesByAttachmentJunctionId(client);

  const result = combineData(
    places.stringIdToPlace,
    legacyReforms,
    citationsByLegacyReformJunctionId,
    filesByAttachmentJunctionId,
  );

  await saveCoreData(result);
  await saveExtendedData(result);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
