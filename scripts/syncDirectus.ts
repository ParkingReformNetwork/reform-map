/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";

import { updateItem } from "@directus/sdk";
import NodeGeocoder from "node-geocoder";

import {
  initDirectus,
  DirectusClient,
  Place as DirectusPlace,
  LegacyReform,
  Citation as DirectusCitation,
  readItemsBatched,
  readCitationsFilesBatched,
} from "./lib/directus";
import { PlaceId as PlaceStringId } from "../src/js/types";
import { getLongLat, initGeocoder } from "./lib/geocoder";
import { Attachment, Citation, RawCompleteEntry } from "./lib/data";
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
  const records = await readItemsBatched(client, "places", [
    "id",
    "name",
    "state",
    "country_code",
    "population",
    "complete_minimums_repeal",
    "coordinates",
  ]);
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
  const records = await readItemsBatched(client, "legacy_reforms", [
    "id",
    "place",
    "last_verified_at",
    "policy_changes",
    "land_uses",
    "reform_scope",
    "requirements",
    "status",
    "summary",
    "reporter",
    "reform_date",
    "citations",
  ]);
  return Object.fromEntries(
    records.map((record) => [placeDirectusIdToStringId[record.place], record]),
  );
}

async function readCitationsByLegacyReformJunctionId(
  client: DirectusClient,
): Promise<Record<number, Partial<DirectusCitation>>> {
  const rawCitations = await readItemsBatched(client, "citations", [
    "id",
    "type",
    "source_description",
    "notes",
    "url",
    "attachments",
  ]);
  const citations = Object.fromEntries(
    rawCitations.map((record) => [record.id, record]),
  );
  const junctionRecords = await readItemsBatched(
    client,
    "legacy_reforms_citations",
    ["id", "citations_id"],
    300,
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
  const rawFiles = await readCitationsFilesBatched(client, ["id", "type"], 300);
  const fileTypesById = Object.fromEntries(
    rawFiles.map((record) => [record.id, record.type]),
  );

  const rawCitationFileJunctions = await readItemsBatched(
    client,
    "citations_files",
    ["id", "directus_files_id"],
    300,
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
): Record<PlaceStringId, RawCompleteEntry> {
  return Object.fromEntries(
    Object.entries(places)
      // Skip unverified reforms.
      .filter(([placeId]) => legacyReforms[placeId].last_verified_at !== null)
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
        const result: RawCompleteEntry = {
          place: {
            name: place.name!,
            state: place.state!,
            country: place.country_code!,
            pop: place.population!,
            repeal: place.complete_minimums_repeal!,
            coord: place.coordinates!.coordinates,
          },
          legacy: {
            summary: reform.summary!,
            status: reform.status!,
            policy: reform.policy_changes!,
            scope: reform.reform_scope!,
            land: reform.land_uses!,
            date: reform.reform_date!,
            reporter: reform.reporter!,
            requirements: reform.requirements!,
            citations,
          },
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
  result: Record<PlaceStringId, RawCompleteEntry>,
): Promise<void> {
  const pruned = Object.fromEntries(
    Object.entries(result).map(([placeId, entry]) => [
      placeId,
      {
        place: {
          name: entry.place.name,
          state: entry.place.state,
          country: entry.place.country,
          pop: entry.place.pop,
          coord: entry.place.coord,
          repeal: entry.place.repeal,
        },
        ...(entry.legacy && {
          legacy: {
            summary: entry.legacy.summary,
            status: entry.legacy.status,
            policy: entry.legacy.policy.sort(),
            scope: entry.legacy.scope.sort(),
            land: entry.legacy.land.sort(),
            date: entry.legacy.date,
          },
        }),
      },
    ]),
  );
  const json = JSON.stringify(pruned, null, 2);
  console.log("Writing data/core.json");
  await fs.writeFile("data/core.json", json);
}

async function saveExtendedData(
  result: Record<PlaceStringId, RawCompleteEntry>,
): Promise<void> {
  const pruned = Object.fromEntries(
    Object.entries(result).map(([placeId, entry]) => [
      placeId,
      entry.legacy
        ? {
            legacy: {
              reporter: entry.legacy.reporter,
              requirements: entry.legacy.requirements.sort(),
              citations: entry.legacy.citations,
            },
          }
        : {},
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
