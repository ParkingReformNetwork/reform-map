import fs from "fs/promises";

import { zipWith } from "lodash-es";

import {
  Date,
  RawCoreEntry,
  PlaceId,
  RawPlace,
  RawLegacyReform,
  RawCorePolicy,
  ProcessedPlace,
  ProcessedLegacyReform,
  ProcessedCorePolicy,
} from "../../src/js/types";
import { processRawCoreEntry } from "../../src/js/data";

export interface DirectusFile {
  fileName: string;
  directusId: string;
}

export interface Citation {
  description: string;
  url: string | null;
  notes: string | null;
  attachments: DirectusFile[];
  screenshots: DirectusFile[];
}

export interface ExtendedPolicy {
  reporter: string | null;
  requirements: string[];
  citations: Citation[];
}

export type RawExtendedEntry = {
  legacy?: ExtendedPolicy;
  reduce_min?: ExtendedPolicy[];
  rm_min?: ExtendedPolicy[];
  add_max?: ExtendedPolicy[];
};

export type RawCompletePolicy = RawCorePolicy & ExtendedPolicy;
export type RawCompleteLegacyReform = RawLegacyReform & ExtendedPolicy;

export interface RawCompleteEntry {
  place: RawPlace;
  legacy?: RawCompleteLegacyReform;
  reduce_min?: Array<RawCompletePolicy>;
  rm_min?: Array<RawCompletePolicy>;
  add_max?: Array<RawCompletePolicy>;
}

export interface ProcessedExtendedEntry {
  unifiedPolicy: ExtendedPolicy;
  reduce_min?: ExtendedPolicy[];
  rm_min?: ExtendedPolicy[];
  add_max?: ExtendedPolicy[];
}

export type ProcessedCompletePolicy = ProcessedCorePolicy & ExtendedPolicy;
export type ProcessedCompleteLegacyReform = ProcessedLegacyReform &
  ExtendedPolicy;

export interface ProcessedCompleteEntry {
  place: ProcessedPlace;
  unifiedPolicy: ProcessedCompleteLegacyReform;
  reduce_min?: Array<ProcessedCompletePolicy>;
  rm_min?: Array<ProcessedCompletePolicy>;
  add_max?: Array<ProcessedCompletePolicy>;
}

export async function readRawCoreData(): Promise<
  Record<PlaceId, RawCoreEntry>
> {
  const raw = await fs.readFile("data/core.json", "utf8");
  return JSON.parse(raw);
}

export async function readRawExtendedData(): Promise<
  Record<PlaceId, RawExtendedEntry>
> {
  const raw = await fs.readFile("data/extended.json", "utf8");
  return JSON.parse(raw);
}

function mergeRawPolicies(
  corePolicies: RawCorePolicy[],
  extendedPolicies: ExtendedPolicy[],
  placeId: PlaceId,
  policyKeyName: string,
): RawCompletePolicy[] {
  return zipWith(
    corePolicies,
    extendedPolicies,
    (corePolicy, extendedPolicy) => {
      if (!corePolicy || !extendedPolicy) {
        throw new Error(
          `Unequal number of '${policyKeyName}' entries for '${placeId}' between data/core.json and data/extended.json`,
        );
      }
      return {
        ...corePolicy,
        ...extendedPolicy,
      };
    },
  );
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
          ...(coreEntry.legacy &&
            extendedEntry.legacy && {
              legacy: { ...coreEntry.legacy, ...extendedEntry.legacy },
            }),
          ...(coreEntry.reduce_min &&
            extendedEntry.reduce_min && {
              reduce_min: mergeRawPolicies(
                coreEntry.reduce_min,
                extendedEntry.reduce_min,
                placeId,
                "reduce_min",
              ),
            }),
          ...(coreEntry.rm_min &&
            extendedEntry.rm_min && {
              rm_min: mergeRawPolicies(
                coreEntry.rm_min,
                extendedEntry.rm_min,
                placeId,
                "rm_min",
              ),
            }),
          ...(coreEntry.add_max &&
            extendedEntry.add_max && {
              add_max: mergeRawPolicies(
                coreEntry.add_max,
                extendedEntry.add_max,
                placeId,
                "add_max",
              ),
            }),
        },
      ];
    }),
  );
}

function processCompletePolicy(
  policy: RawCompletePolicy,
): ProcessedCompletePolicy {
  return {
    ...policy,
    date: Date.fromNullable(policy.date),
  };
}

export async function readProcessedCompleteData(): Promise<
  Record<PlaceId, ProcessedCompleteEntry>
> {
  const raw = await readRawCompleteData();
  return Object.fromEntries(
    Object.entries(raw).map(([placeId, entry]) => {
      const processed = processRawCoreEntry(placeId, entry, {
        includeMultipleReforms: true,
      });

      let unifiedPolicy: ProcessedCompleteLegacyReform;
      if (entry.legacy) {
        unifiedPolicy = {
          ...entry.legacy,
          date: processed.unifiedPolicy.date,
        };
      } else {
        // If legacy is missing, we will have already validated through processRawCoreEntry
        // that there is exactly one new-style reform. We can use that to look up the
        // ExtendedEntry in `entry`, since processed.unifiedPolicy will be missing an ExtendedEntry otherwise.
        if (processed.unifiedPolicy.policy.length !== 1) {
          throw new Error(
            `Expected exactly one new-style policy in ${placeId}: ${processed.unifiedPolicy.policy}`,
          );
        }
        const policyType = processed.unifiedPolicy.policy[0];
        const policyCollection = {
          "reduce parking minimums": entry.reduce_min,
          "remove parking minimums": entry.rm_min,
          "add parking maximums": entry.add_max,
        }[policyType];
        if (!policyCollection || policyCollection.length !== 1) {
          throw new Error(
            `Expected exactly one new-style policy in ${placeId}: ${processed.unifiedPolicy.policy}`,
          );
        }
        const policyRecord = policyCollection[0];
        unifiedPolicy = {
          ...policyRecord,
          policy: processed.unifiedPolicy.policy,
          date: processed.unifiedPolicy.date,
        };
      }

      const result: ProcessedCompleteEntry = {
        place: processed.place,
        unifiedPolicy,
      };
      if (entry.add_max) {
        result.add_max = entry.add_max.map(processCompletePolicy);
      }
      if (entry.reduce_min) {
        result.reduce_min = entry.reduce_min.map(processCompletePolicy);
      }
      if (entry.rm_min) {
        result.rm_min = entry.rm_min.map(processCompletePolicy);
      }
      return [placeId, result];
    }),
  );
}

export function getCitations(entry: RawExtendedEntry): Citation[] {
  const fromArray = (policies: ExtendedPolicy[] | undefined): Citation[] =>
    policies?.flatMap((policy) => policy.citations) ?? [];

  return [
    ...(entry.legacy?.citations ?? []),
    ...fromArray(entry.add_max),
    ...fromArray(entry.rm_min),
    ...fromArray(entry.reduce_min),
  ];
}
