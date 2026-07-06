import fs from "node:fs/promises";

import { zipWith } from "lodash-es";
import { processRawCoreEntry } from "../../src/js/model/data";
import { ReformDate } from "../../src/js/model/ReformDate";
import type {
  PlaceId,
  ProcessedCoreBenefitDistrict,
  ProcessedCoreLandUsePolicy,
  ProcessedPlace,
  RawCoreBenefitDistrict,
  RawCoreEntry,
  RawCoreLandUsePolicy,
  RawPlace,
} from "../../src/js/model/types";
import { CORE_DATA_PATH, EXTENDED_DATA_PATH } from "./paths";

export interface DirectusFile {
  fileName: string;
  directusId: string;
}

export interface Citation {
  id: number;
  description: string;
  url: string | null;
  notes: string | null;
  attachments: DirectusFile[];
  screenshots: DirectusFile[];
}

export interface ExtendedBenefitDistrict {
  summary: string;
  reporter: string | null;
  citations: Citation[];
}

export interface ExtendedLandUsePolicy {
  summary: string;
  reporter: string | null;
  requirements: string[];
  citations: Citation[];
}

export type ExtendedEntry = {
  benefit_district?: ExtendedBenefitDistrict[];
  reduce_min?: ExtendedLandUsePolicy[];
  rm_min?: ExtendedLandUsePolicy[];
  add_max?: ExtendedLandUsePolicy[];
};

export type RawCompleteBenefitDistrict = RawCoreBenefitDistrict &
  ExtendedBenefitDistrict;
export type RawCompleteLandUsePolicy = RawCoreLandUsePolicy &
  ExtendedLandUsePolicy;

export interface RawCompleteEntry {
  place: RawPlace;
  benefit_district?: Array<RawCompleteBenefitDistrict>;
  reduce_min?: Array<RawCompleteLandUsePolicy>;
  rm_min?: Array<RawCompleteLandUsePolicy>;
  add_max?: Array<RawCompleteLandUsePolicy>;
}

export type ProcessedCompleteBenefitDistrict = ProcessedCoreBenefitDistrict &
  ExtendedBenefitDistrict;
export type ProcessedCompleteLandUsePolicy = ProcessedCoreLandUsePolicy &
  ExtendedLandUsePolicy;

export interface ProcessedCompleteEntry {
  place: ProcessedPlace;
  benefit_district?: Array<ProcessedCompleteBenefitDistrict>;
  reduce_min?: Array<ProcessedCompleteLandUsePolicy>;
  rm_min?: Array<ProcessedCompleteLandUsePolicy>;
  add_max?: Array<ProcessedCompleteLandUsePolicy>;
}

export async function readRawCoreData(): Promise<
  Record<PlaceId, RawCoreEntry>
> {
  const raw = await fs.readFile(CORE_DATA_PATH, "utf8");
  return JSON.parse(raw);
}

export async function readRawExtendedData(): Promise<
  Record<PlaceId, ExtendedEntry>
> {
  const raw = await fs.readFile(EXTENDED_DATA_PATH, "utf8");
  return JSON.parse(raw);
}

function mergeRawEntries<Core, Extended>(
  coreEntries: Core[],
  extendedEntries: Extended[],
  placeId: PlaceId,
  entryKeyName: string,
): (Core & Extended)[] {
  return zipWith(coreEntries, extendedEntries, (coreEntry, extendedEntry) => {
    if (!coreEntry || !extendedEntry) {
      throw new Error(
        `Unequal number of '${entryKeyName}' entries for '${placeId}' between ${CORE_DATA_PATH} and ${EXTENDED_DATA_PATH}`,
      );
    }
    return {
      ...coreEntry,
      ...extendedEntry,
    };
  });
}

export async function readRawCompleteData(): Promise<
  Record<PlaceId, RawCompleteEntry>
> {
  const [coreData, extendedData] = await Promise.all([
    readRawCoreData(),
    readRawExtendedData(),
  ]);
  return Object.fromEntries(
    Object.entries(coreData).map(([placeId, coreEntry]) => {
      const extendedEntry = extendedData[placeId];
      return [
        placeId,
        {
          place: coreEntry.place,
          ...(coreEntry.reduce_min &&
            extendedEntry.reduce_min && {
              reduce_min: mergeRawEntries(
                coreEntry.reduce_min,
                extendedEntry.reduce_min,
                placeId,
                "reduce_min",
              ),
            }),
          ...(coreEntry.rm_min &&
            extendedEntry.rm_min && {
              rm_min: mergeRawEntries(
                coreEntry.rm_min,
                extendedEntry.rm_min,
                placeId,
                "rm_min",
              ),
            }),
          ...(coreEntry.add_max &&
            extendedEntry.add_max && {
              add_max: mergeRawEntries(
                coreEntry.add_max,
                extendedEntry.add_max,
                placeId,
                "add_max",
              ),
            }),
          ...(coreEntry.benefit_district &&
            extendedEntry.benefit_district && {
              benefit_district: mergeRawEntries(
                coreEntry.benefit_district,
                extendedEntry.benefit_district,
                placeId,
                "benefit_district",
              ),
            }),
        },
      ];
    }),
  );
}

function processCompleteBenefitDistrict(
  record: RawCompleteBenefitDistrict,
): ProcessedCompleteBenefitDistrict {
  return {
    ...record,
    date: ReformDate.fromNullable(record.date),
  };
}

function processCompleteLandUsePolicy(
  policy: RawCompleteLandUsePolicy,
): ProcessedCompleteLandUsePolicy {
  return {
    ...policy,
    date: ReformDate.fromNullable(policy.date),
  };
}

export async function readProcessedCompleteData(): Promise<
  Record<PlaceId, ProcessedCompleteEntry>
> {
  const raw = await readRawCompleteData();
  return Object.fromEntries(
    Object.entries(raw).map(([placeId, entry]) => {
      const processed = processRawCoreEntry(entry);
      const result: ProcessedCompleteEntry = {
        place: processed.place,
      };
      if (entry.add_max) {
        result.add_max = entry.add_max.map(processCompleteLandUsePolicy);
      }
      if (entry.reduce_min) {
        result.reduce_min = entry.reduce_min.map(processCompleteLandUsePolicy);
      }
      if (entry.rm_min) {
        result.rm_min = entry.rm_min.map(processCompleteLandUsePolicy);
      }
      if (entry.benefit_district) {
        result.benefit_district = entry.benefit_district.map(
          processCompleteBenefitDistrict,
        );
      }
      return [placeId, result];
    }),
  );
}

export function getCitations(entry: ExtendedEntry): Citation[] {
  const fromArray = (
    policies: Array<{ citations: Citation[] }> | undefined,
  ): Citation[] => policies?.flatMap((policy) => policy.citations) ?? [];

  return [
    ...fromArray(entry.benefit_district),
    ...fromArray(entry.add_max),
    ...fromArray(entry.rm_min),
    ...fromArray(entry.reduce_min),
  ];
}
