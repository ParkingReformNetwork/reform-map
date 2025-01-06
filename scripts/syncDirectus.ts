/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import fs from "fs/promises";

import { groupBy, kebabCase } from "lodash-es";
import { updateItem } from "@directus/sdk";
import NodeGeocoder from "node-geocoder";

import {
  initDirectus,
  DirectusClient,
  Place as DirectusPlace,
  Citation as DirectusCitation,
  readItemsBatched,
  readCitationsFilesBatched,
  PolicyRecord,
} from "./lib/directus";
import {
  Date,
  PlaceId as PlaceStringId,
  PlaceType,
  PolicyType,
  RawCorePolicy,
  ReformStatus,
  UNKNOWN_YEAR,
} from "../src/js/model/types";
import { COUNTRY_MAPPING } from "../src/js/model/data";
import { getLongLat, initGeocoder } from "./lib/geocoder";
import {
  DirectusFile,
  Citation,
  ExtendedPolicy,
  RawCompleteEntry,
} from "./lib/data";

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
    "type",
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
      "archived",
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
    {
      _and: [
        { last_verified_at: { _nnull: true } },
        { archived: { _eq: false } },
      ],
    },
  );
  return groupBy(records, (record) => placeDirectusIdToStringId[record.place]);
}

async function readCitations(
  client: DirectusClient,
): Promise<Record<number, Partial<DirectusCitation>>> {
  const rawCitations = await readItemsBatched(client, "citations", [
    "id",
    "source_description",
    "notes",
    "url",
    "attachments",
  ]);
  return Object.fromEntries(rawCitations.map((record) => [record.id, record]));
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

interface AttachmentFileNameArgsBase {
  placeId: string;
  hasDistinctPolicyTypes: boolean;
  policyType: PolicyType;
  /// The index of policy records for the current `policyType`. If
  /// there is only one record for the `policyType`, this value should
  /// be set to `null`.
  policyRecordIdx: number | null;
}

type AttachmentFileNameArgs = AttachmentFileNameArgsBase & {
  /// The index of citations for the current policy record. If
  /// there is only one citation for the policy record, this value
  /// should be set to `null`.
  citationIdx: number | null;
};

export function createAttachments(
  filesByAttachmentJunctionId: Record<number, FileMetadata>,
  attachmentJunctionIds: number[],
  fileNameArgs: AttachmentFileNameArgs,
): { attachments: DirectusFile[]; screenshots: DirectusFile[] } {
  const attachmentIds: Array<{ directusId: string; extension: string }> = [];
  const screenshotIds: Array<{ directusId: string; extension: string }> = [];
  attachmentJunctionIds.forEach((attachmentJunctionId) => {
    const fileMetadata = filesByAttachmentJunctionId[attachmentJunctionId];
    const fileExtension = mimeTypeToFileExtension(fileMetadata);
    const result = { extension: fileExtension, directusId: fileMetadata.id };
    if (fileExtension === "pdf" || fileExtension === "docx") {
      attachmentIds.push(result);
    } else {
      screenshotIds.push(result);
    }
  });

  let fileNamePrefix = kebabCase(fileNameArgs.placeId);
  if (
    fileNameArgs.hasDistinctPolicyTypes ||
    fileNameArgs.policyRecordIdx !== null
  ) {
    const policyType = {
      "add parking maximums": "add-max",
      "reduce parking minimums": "reduce-min",
      "remove parking minimums": "remove-min",
    }[fileNameArgs.policyType];
    const recordIdx =
      fileNameArgs.policyRecordIdx === null
        ? ""
        : `${fileNameArgs.policyRecordIdx + 1}`;
    fileNamePrefix += `-${policyType}${recordIdx}`;
  }
  if (fileNameArgs.citationIdx !== null) {
    fileNamePrefix += `-citation${fileNameArgs.citationIdx + 1}`;
  }

  const attachments: DirectusFile[] = attachmentIds.map(
    ({ directusId, extension }, idx) => {
      const fileIndex = attachmentIds.length === 1 ? "" : `${idx + 1}`;
      const fileName = `${fileNamePrefix}-attachment${fileIndex}.${extension}`;
      return { fileName, directusId };
    },
  );
  const screenshots: DirectusFile[] = screenshotIds.map(
    ({ directusId, extension }, idx) => {
      const fileIndex = screenshotIds.length === 1 ? "" : `${idx + 1}`;
      const fileName = `${fileNamePrefix}-screenshot${fileIndex}.${extension}`;
      return { fileName, directusId };
    },
  );
  return { attachments, screenshots };
}

function createCitations(
  citationJunctionIds: number[],
  citationsByJunctionId: Record<number, Partial<DirectusCitation>>,
  filesByAttachmentJunctionId: Record<number, FileMetadata>,
  fileNameArgs: AttachmentFileNameArgsBase,
): Citation[] {
  return citationJunctionIds.map((junctionId, citationIdx) => {
    const citationRecord = citationsByJunctionId[junctionId];
    const { attachments, screenshots } = createAttachments(
      filesByAttachmentJunctionId,
      citationRecord.attachments!,
      {
        ...fileNameArgs,
        citationIdx: citationJunctionIds.length === 1 ? null : citationIdx,
      },
    );
    return {
      description: citationRecord.source_description!,
      url: citationRecord.url!,
      notes: citationRecord.notes!,
      attachments,
      screenshots,
    };
  });
}

function combineData(
  places: Record<PlaceStringId, Partial<DirectusPlace>>,
  policyRecords: Record<PlaceStringId, Array<Partial<PolicyRecord>>>,
  citationsByPolicyRecordJunctionId: Record<number, Partial<DirectusCitation>>,
  filesByAttachmentJunctionId: Record<number, FileMetadata>,
): Record<PlaceStringId, RawCompleteEntry> {
  return Object.fromEntries(
    Object.entries(places)
      .map(([placeId, place]): [PlaceStringId, RawCompleteEntry] => {
        let numAddMax = 0;
        let numReduceMin = 0;
        let numRmMin = 0;
        if (policyRecords[placeId]) {
          policyRecords[placeId].forEach((record) => {
            if (record.type === "add parking maximums") numAddMax += 1;
            if (record.type === "reduce parking minimums") numReduceMin += 1;
            if (record.type === "remove parking minimums") numRmMin += 1;
          });
        }
        const hasDistinctPolicyTypes =
          [numAddMax, numReduceMin, numRmMin].filter(Boolean).length > 1;

        const addMax: Array<RawCorePolicy & ExtendedPolicy> = [];
        const reduceMin: Array<RawCorePolicy & ExtendedPolicy> = [];
        const rmMin: Array<RawCorePolicy & ExtendedPolicy> = [];
        if (policyRecords[placeId]) {
          policyRecords[placeId].forEach((record) => {
            const [collection, numPolicyRecords] = {
              "add parking maximums": [addMax, numAddMax] as const,
              "reduce parking minimums": [reduceMin, numReduceMin] as const,
              "remove parking minimums": [rmMin, numRmMin] as const,
            }[record.type!];
            const policyRecordIdx =
              numPolicyRecords > 1 ? collection.length : null;
            const policy = {
              summary: record.summary!,
              status: record.status!,
              scope: record.reform_scope!,
              land: record.land_uses!,
              date: record.reform_date!,
              reporter: record.reporter!,
              requirements: record.requirements!,
              citations: createCitations(
                record.citations!,
                citationsByPolicyRecordJunctionId,
                filesByAttachmentJunctionId,
                {
                  placeId,
                  hasDistinctPolicyTypes,
                  policyType: record.type!,
                  policyRecordIdx,
                },
              ),
            };
            collection.push(policy);
          });
        }

        const result: RawCompleteEntry = {
          place: {
            name: place.name!,
            state: place.state!,
            country: place.country_code!,
            type: place.type!,
            pop: place.population!,
            repeal: place.complete_minimums_repeal!,
            coord: place.coordinates!.coordinates,
          },
          ...(addMax.length && { add_max: addMax }),
          ...(reduceMin.length && { reduce_min: reduceMin }),
          ...(rmMin.length && { rm_min: rmMin }),
        };
        return [placeId, result];
      })
      // Filter out places without any policy records.
      .filter(
        ([, entry]) =>
          entry.add_max?.length ||
          entry.rm_min?.length ||
          entry.reduce_min?.length,
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
          type: entry.place.type,
          pop: entry.place.pop,
          coord: entry.place.coord,
          repeal: entry.place.repeal,
        },
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
    summary: record.summary,
    reporter: record.reporter,
    requirements: record.requirements.sort(),
    citations: record.citations,
  });

  const pruned = Object.fromEntries(
    Object.entries(result).map(([placeId, entry]) => [
      placeId,
      {
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

async function saveOptionValues(entries: RawCompleteEntry[]): Promise<void> {
  const policy: PolicyType[] = [
    "add parking maximums",
    "reduce parking minimums",
    "remove parking minimums",
  ];
  const placeType: PlaceType[] = ["city", "county", "state", "country"];
  const status: ReformStatus[] = ["adopted", "proposed", "repealed"];

  const scope = new Set<string>();
  const landUse = new Set<string>();
  const country = new Set<string>();
  const year = new Set<string>([UNKNOWN_YEAR]);

  const savePolicyRecord = (policyRecord: RawCorePolicy): void => {
    policyRecord.scope.forEach((v) => scope.add(v));
    policyRecord.land.forEach((v) => landUse.add(v));
    if (policyRecord.date) {
      year.add(new Date(policyRecord.date).parsed.year.toString());
    }
  };

  entries.forEach((entry) => {
    country.add(COUNTRY_MAPPING[entry.place.country] ?? entry.place.country);
    entry.add_max?.forEach(savePolicyRecord);
    entry.reduce_min?.forEach(savePolicyRecord);
    entry.rm_min?.forEach(savePolicyRecord);
  });
  const result = {
    placeType,
    policy,
    status,
    scope: Array.from(scope).sort(),
    landUse: Array.from(landUse).sort(),
    country: Array.from(country).sort(),
    year: Array.from(year).sort().reverse(),
  };
  const json = JSON.stringify(result, null, 2);
  console.log("Writing data/option-values.json");
  await fs.writeFile("data/option-values.json", json);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main(): Promise<void> {
  const client = await initDirectus();
  const geocoder = initGeocoder();

  const places = await readPlacesAndEnsureCoordinates(client, geocoder);
  const policyRecords = await readPolicyRecords(
    client,
    places.directusIdToStringId,
  );
  const citations = await readCitations(client);
  const citationsByPolicyRecordJunctionId =
    await readCitationsByPolicyRecordJunctionId(client, citations);
  const filesByAttachmentJunctionId =
    await readFilesByAttachmentJunctionId(client);

  const result = combineData(
    places.stringIdToPlace,
    policyRecords,
    citationsByPolicyRecordJunctionId,
    filesByAttachmentJunctionId,
  );

  await saveCoreData(result);
  await saveExtendedData(result);
  await saveOptionValues(Object.values(result));
  process.exit(0);
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
