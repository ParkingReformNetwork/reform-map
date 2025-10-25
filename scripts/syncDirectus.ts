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
  LandUseRecord,
  BenefitDistrict,
} from "./lib/directus";
import {
  PlaceId as PlaceStringId,
  PolicyType,
  RawCoreBenefitDistrict,
  RawCoreLandUsePolicy,
} from "../src/js/model/types";
import { getLongLat, initGeocoder } from "./lib/geocoder";
import {
  DirectusFile,
  Citation,
  ExtendedLandUsePolicy,
  RawCompleteEntry,
  RawCompleteLandUsePolicy,
  RawCompleteBenefitDistrict,
  ExtendedBenefitDistrict,
  readRawCoreData,
} from "./lib/data";
import { saveOptionValues } from "./lib/optionValues";
import { COUNTRY_MAPPING } from "../src/js/model/data";
import {
  determinePlaceIdForDirectus,
  encodePlaceId,
} from "../src/js/model/placeId";

// --------------------------------------------------------------------------
// Read prior data
// --------------------------------------------------------------------------

async function readPriorEncodedPlaceIds(): Promise<
  Partial<Record<PlaceStringId, string>>
> {
  const data = await readRawCoreData();
  return Object.fromEntries(
    Object.entries(data).map(([placeId, entry]) => [
      placeId,
      entry.place.encoded,
    ]),
  );
}

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
    const stringId = determinePlaceIdForDirectus(record);

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

async function readLandUseRecords(
  client: DirectusClient,
  placeDirectusIdToStringId: Record<number, PlaceStringId>,
): Promise<Record<PlaceStringId, Array<Partial<LandUseRecord>>>> {
  const records = await readItemsBatched(
    client,
    "land_use",
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

async function readBenefitDistrictRecords(
  client: DirectusClient,
  placeDirectusIdToStringId: Record<number, PlaceStringId>,
): Promise<Record<PlaceStringId, Array<Partial<BenefitDistrict>>>> {
  const records = await readItemsBatched(
    client,
    "benefit_districts",
    [
      "id",
      "place",
      "archived",
      "last_verified_at",
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
    "broken_url",
    "attachments",
  ]);
  return Object.fromEntries(rawCitations.map((record) => [record.id, record]));
}

async function readCitationsByJunctionId(
  client: DirectusClient,
  citations: Record<number, Partial<DirectusCitation>>,
  table: "land_use_citations" | "benefit_districts_citations",
): Promise<Record<number, Partial<DirectusCitation>>> {
  const junctionRecords = await readItemsBatched(
    client,
    table,
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
  /// The index of land use records for the current `policyType`. If
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
      "parking benefit district": "benefit-district",
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
    const url = citationRecord.broken_url === true ? null : citationRecord.url!;
    return {
      id: citationRecord.id!,
      description: citationRecord.source_description!,
      url,
      notes: citationRecord.notes!,
      attachments,
      screenshots,
    };
  });
}

function combineData(
  priorEncodedPlaceIds: Partial<Record<PlaceStringId, string>>,
  places: Record<PlaceStringId, Partial<DirectusPlace>>,
  landUseRecords: Record<PlaceStringId, Array<Partial<LandUseRecord>>>,
  benefitDistrictRecords: Record<
    PlaceStringId,
    Array<Partial<BenefitDistrict>>
  >,
  citationsByLandUseJunctionId: Record<number, Partial<DirectusCitation>>,
  citationsByBenefitDistrictJunctionId: Record<
    number,
    Partial<DirectusCitation>
  >,
  filesByAttachmentJunctionId: Record<number, FileMetadata>,
): Record<PlaceStringId, RawCompleteEntry> {
  return Object.fromEntries(
    Object.entries(places)
      .map(([placeId, place]): [PlaceStringId, RawCompleteEntry] => {
        let numAddMax = 0;
        let numReduceMin = 0;
        let numRmMin = 0;
        if (landUseRecords[placeId]) {
          landUseRecords[placeId].forEach((record) => {
            if (record.type === "add parking maximums") numAddMax += 1;
            if (record.type === "reduce parking minimums") numReduceMin += 1;
            if (record.type === "remove parking minimums") numRmMin += 1;
          });
        }
        const numBenefitDistrict = benefitDistrictRecords[placeId]?.length ?? 0;
        const hasDistinctPolicyTypes =
          [numAddMax, numReduceMin, numRmMin, numBenefitDistrict].filter(
            Boolean,
          ).length > 1;

        const addMax: Array<RawCompleteLandUsePolicy> = [];
        const reduceMin: Array<RawCompleteLandUsePolicy> = [];
        const rmMin: Array<RawCompleteLandUsePolicy> = [];
        if (landUseRecords[placeId]) {
          landUseRecords[placeId].forEach((record) => {
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
              date: record.reform_date! ?? undefined,
              reporter: record.reporter!,
              requirements: record.requirements!,
              citations: createCitations(
                record.citations!,
                citationsByLandUseJunctionId,
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

        const benefitDistricts: Array<RawCompleteBenefitDistrict> = [];
        if (benefitDistrictRecords[placeId]) {
          benefitDistrictRecords[placeId].forEach((record) => {
            const policyRecordIdx =
              numBenefitDistrict > 1 ? benefitDistricts.length : null;
            benefitDistricts.push({
              summary: record.summary!,
              status: record.status!,
              date: record.reform_date! ?? undefined,
              reporter: record.reporter!,
              citations: createCitations(
                record.citations!,
                citationsByBenefitDistrictJunctionId,
                filesByAttachmentJunctionId,
                {
                  placeId,
                  hasDistinctPolicyTypes,
                  policyType: "parking benefit district",
                  policyRecordIdx,
                },
              ),
            });
          });
        }

        const result: RawCompleteEntry = {
          place: {
            name: place.name!,
            state: place.state!,
            country:
              COUNTRY_MAPPING[place.country_code!] ?? place.country_code!,
            type: place.type!,
            encoded: priorEncodedPlaceIds[placeId] ?? encodePlaceId(placeId),
            pop: place.population!,
            repeal: place.complete_minimums_repeal ? true : undefined,
            coord: place.coordinates!.coordinates,
          },
          ...(addMax.length && { add_max: addMax }),
          ...(reduceMin.length && { reduce_min: reduceMin }),
          ...(rmMin.length && { rm_min: rmMin }),
          ...(benefitDistricts.length && {
            benefit_district: benefitDistricts,
          }),
        };
        return [placeId, result];
      })
      // Filter out places without any policy records.
      .filter(
        ([, entry]) =>
          entry.add_max?.length ||
          entry.rm_min?.length ||
          entry.reduce_min?.length ||
          entry.benefit_district?.length,
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
  const formatLandUse = (record: RawCoreLandUsePolicy) => ({
    status: record.status,
    scope: record.scope.sort(),
    land: record.land.sort(),
    date: record.date,
  });

  const formatBenefitDistrict = (record: RawCoreBenefitDistrict) => ({
    status: record.status,
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
          encoded: entry.place.encoded,
          pop: entry.place.pop,
          coord: entry.place.coord,
          repeal: entry.place.repeal,
        },
        ...(entry.add_max && {
          add_max: entry.add_max.map(formatLandUse),
        }),
        ...(entry.reduce_min && {
          reduce_min: entry.reduce_min.map(formatLandUse),
        }),
        ...(entry.rm_min && {
          rm_min: entry.rm_min.map(formatLandUse),
        }),
        ...(entry.benefit_district && {
          benefit_district: entry.benefit_district.map(formatBenefitDistrict),
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
  const formatLandUse = (record: ExtendedLandUsePolicy) => ({
    summary: record.summary,
    reporter: record.reporter,
    requirements: record.requirements.sort(),
    citations: record.citations,
  });

  const formatBenefitDistrict = (record: ExtendedBenefitDistrict) => ({
    summary: record.summary,
    reporter: record.reporter,
    citations: record.citations,
  });

  const pruned = Object.fromEntries(
    Object.entries(result).map(([placeId, entry]) => [
      placeId,
      {
        ...(entry.add_max && { add_max: entry.add_max.map(formatLandUse) }),
        ...(entry.reduce_min && {
          reduce_min: entry.reduce_min.map(formatLandUse),
        }),
        ...(entry.rm_min && { rm_min: entry.rm_min.map(formatLandUse) }),
        ...(entry.benefit_district && {
          benefit_district: entry.benefit_district.map(formatBenefitDistrict),
        }),
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

  const priorEncodedPlaceIds = await readPriorEncodedPlaceIds();

  const places = await readPlacesAndEnsureCoordinates(client, geocoder);
  const landUseRecords = await readLandUseRecords(
    client,
    places.directusIdToStringId,
  );
  const benefitDistrictRecords = await readBenefitDistrictRecords(
    client,
    places.directusIdToStringId,
  );
  const citations = await readCitations(client);
  const citationsByLandUseJunctionId = await readCitationsByJunctionId(
    client,
    citations,
    "land_use_citations",
  );
  const citationsByBenefitDistrictJunctionId = await readCitationsByJunctionId(
    client,
    citations,
    "benefit_districts_citations",
  );
  const filesByAttachmentJunctionId =
    await readFilesByAttachmentJunctionId(client);

  const result = combineData(
    priorEncodedPlaceIds,
    places.stringIdToPlace,
    landUseRecords,
    benefitDistrictRecords,
    citationsByLandUseJunctionId,
    citationsByBenefitDistrictJunctionId,
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
