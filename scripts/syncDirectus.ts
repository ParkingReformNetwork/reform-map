/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";

import { groupBy } from "lodash-es";
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
  PolicyRecord,
} from "./lib/directus";
import { PlaceId as PlaceStringId, RawCorePolicy } from "../src/js/types";
import { getLongLat, initGeocoder } from "./lib/geocoder";
import {
  Attachment,
  Citation,
  ExtendedPolicy,
  RawCompleteEntry,
} from "./lib/data";
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
  const records = await readItemsBatched(
    client,
    "legacy_reforms",
    [
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
    ],
    100,
    { last_verified_at: { _nnull: true } },
  );
  return Object.fromEntries(
    records.map((record) => [placeDirectusIdToStringId[record.place], record]),
  );
}

async function readPolicyRecords(
  client: DirectusClient,
  placeDirectusIdToStringId: Record<number, PlaceStringId>,
): Promise<Record<PlaceStringId, Array<Partial<PolicyRecord>>>> {
  const records = await readItemsBatched(
    client,
    "policy_records",
    [
      "id",
      "place",
      "last_verified_at",
      "type",
      "land_uses",
      "reform_scope",
      "requirements",
      "status",
      "summary",
      "reporter",
      "reform_date",
      "citations",
    ],
    100,
    { last_verified_at: { _nnull: true } },
  );
  return groupBy(records, (record) => placeDirectusIdToStringId[record.place]);
}

async function readCitations(
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
  return Object.fromEntries(rawCitations.map((record) => [record.id, record]));
}

async function readCitationsByLegacyReformJunctionId(
  client: DirectusClient,
  citations: Record<number, Partial<DirectusCitation>>,
): Promise<Record<number, Partial<DirectusCitation>>> {
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

async function readCitationsByPolicyRecordJunctionId(
  client: DirectusClient,
  citations: Record<number, Partial<DirectusCitation>>,
): Promise<Record<number, Partial<DirectusCitation>>> {
  const junctionRecords = await readItemsBatched(
    client,
    "policy_records_citations",
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

function createCitations(
  placeId: PlaceStringId,
  citationJunctionIds: number[],
  citationsByJunctionId: Record<number, Partial<DirectusCitation>>,
  filesByAttachmentJunctionId: Record<number, FileMetadata>,
): Citation[] {
  return citationJunctionIds.map((junctionId, citationIdx) => {
    const citationRecord = citationsByJunctionId[junctionId];
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
  });
}

function combineData(
  places: Record<PlaceStringId, Partial<DirectusPlace>>,
  legacyReforms: Record<PlaceStringId, Partial<LegacyReform>>,
  policyRecords: Record<PlaceStringId, Array<Partial<PolicyRecord>>>,
  citationsByLegacyReformJunctionId: Record<number, Partial<DirectusCitation>>,
  citationsByPolicyRecordJunctionId: Record<number, Partial<DirectusCitation>>,
  filesByAttachmentJunctionId: Record<number, FileMetadata>,
): Record<PlaceStringId, RawCompleteEntry> {
  return Object.fromEntries(
    Object.entries(places)
      .map(([placeId, place]): [PlaceStringId, RawCompleteEntry] => {
        let legacy;
        if (legacyReforms[placeId]) {
          const record = legacyReforms[placeId];
          legacy = {
            summary: record.summary!,
            status: record.status!,
            policy: record.policy_changes!,
            scope: record.reform_scope!,
            land: record.land_uses!,
            date: record.reform_date!,
            reporter: record.reporter!,
            requirements: record.requirements!,
            citations: createCitations(
              placeId,
              record.citations!,
              citationsByLegacyReformJunctionId,
              filesByAttachmentJunctionId,
            ),
          };
        }

        const addMax: Array<RawCorePolicy & ExtendedPolicy> = [];
        const reduceMin: Array<RawCorePolicy & ExtendedPolicy> = [];
        const rmMin: Array<RawCorePolicy & ExtendedPolicy> = [];
        if (policyRecords[placeId]) {
          policyRecords[placeId].forEach((record) => {
            const policy = {
              summary: record.summary!,
              status: record.status!,
              scope: record.reform_scope!,
              land: record.land_uses!,
              date: record.reform_date!,
              reporter: record.reporter!,
              requirements: record.requirements!,
              citations: createCitations(
                placeId,
                record.citations!,
                citationsByPolicyRecordJunctionId,
                filesByAttachmentJunctionId,
              ),
            };
            const collection = {
              "add parking maximums": addMax,
              "reduce parking minimums": reduceMin,
              "remove parking minimums": rmMin,
            }[record.type!];
            collection.push(policy);
          });
        }

        const result: RawCompleteEntry = {
          place: {
            name: place.name!,
            state: place.state!,
            country: place.country_code!,
            pop: place.population!,
            repeal: place.complete_minimums_repeal!,
            coord: place.coordinates!.coordinates,
          },
          ...(legacy && { legacy }),
          ...(addMax.length && { add_max: addMax }),
          ...(reduceMin.length && { reduce_min: reduceMin }),
          ...(rmMin.length && { rm_min: rmMin }),
        };
        return [placeId, result];
      })
      // Filter out places without any policy records.
      .filter(
        ([, entry]) =>
          entry.legacy || entry.add_max || entry.rm_min || entry.reduce_min,
      )
      .sort(),
  );
}

// --------------------------------------------------------------------------
// Save results
// --------------------------------------------------------------------------

async function saveCoreData(
  result: Record<PlaceStringId, RawCompleteEntry>,
): Promise<void> {
  const formatPolicy = (record: RawCorePolicy) => ({
    summary: record.summary,
    status: record.status,
    scope: record.scope.sort(),
    land: record.land.sort(),
    date: record.date,
  });

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
        ...(entry.add_max && {
          add_max: entry.add_max.map(formatPolicy),
        }),
        ...(entry.reduce_min && {
          reduce_min: entry.reduce_min.map(formatPolicy),
        }),
        ...(entry.rm_min && {
          rm_min: entry.rm_min.map(formatPolicy),
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
  const formatPolicy = (record: ExtendedPolicy) => ({
    reporter: record.reporter,
    requirements: record.requirements.sort(),
    citations: record.citations,
  });

  const pruned = Object.fromEntries(
    Object.entries(result).map(([placeId, entry]) => [
      placeId,
      {
        ...(entry.legacy && { legacy: formatPolicy(entry.legacy) }),
        ...(entry.add_max && { add_max: entry.add_max.map(formatPolicy) }),
        ...(entry.reduce_min && {
          reduce_min: entry.reduce_min.map(formatPolicy),
        }),
        ...(entry.rm_min && { rm_min: entry.rm_min.map(formatPolicy) }),
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
  const policyRecords = await readPolicyRecords(
    client,
    places.directusIdToStringId,
  );
  const citations = await readCitations(client);
  const citationsByLegacyReformJunctionId =
    await readCitationsByLegacyReformJunctionId(client, citations);
  const citationsByPolicyRecordJunctionId =
    await readCitationsByPolicyRecordJunctionId(client, citations);
  const filesByAttachmentJunctionId =
    await readFilesByAttachmentJunctionId(client);

  const result = combineData(
    places.stringIdToPlace,
    legacyReforms,
    policyRecords,
    citationsByLegacyReformJunctionId,
    citationsByPolicyRecordJunctionId,
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
