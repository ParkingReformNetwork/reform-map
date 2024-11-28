import fs from "fs/promises";

import { zipWith } from "lodash-es";

import {
  RawCoreEntry,
  PlaceId,
  ProcessedCoreEntry,
  RawPlace,
  RawLegacyReform,
  RawCorePolicy,
} from "../../src/js/types";
import { processRawCoreEntry } from "../../src/js/data";

export type Attachment = {
  fileName: string;
  directusId: string;
  isDoc: boolean;
};

export type CitationType = "city code" | "media report" | "other";

export interface Citation {
  description: string;
  type: CitationType;
  url: string | null;
  notes: string | null;
  attachments: Attachment[];
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

export interface RawCompleteEntry {
  place: RawPlace;
  legacy?: RawLegacyReform & ExtendedPolicy;
  reduce_min?: Array<RawCorePolicy & ExtendedPolicy>;
  rm_min?: Array<RawCorePolicy & ExtendedPolicy>;
  add_max?: Array<RawCorePolicy & ExtendedPolicy>;
}

export interface ProcessedExtendedEntry {
  unifiedPolicy: ExtendedPolicy;
}
export type ProcessedCompleteEntry = ProcessedCoreEntry &
  ProcessedExtendedEntry;

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
): Array<RawCorePolicy & ExtendedPolicy> {
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
              reduce_min: mergeRawPolicies(
                coreEntry.rm_min,
                extendedEntry.rm_min,
                placeId,
                "rm_min",
              ),
            }),
          ...(coreEntry.add_max &&
            extendedEntry.add_max && {
              reduce_min: mergeRawPolicies(
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

export async function readProcessedCompleteData(): Promise<
  Record<PlaceId, ProcessedCompleteEntry>
> {
  const raw = await readRawCompleteData();
  return Object.fromEntries(
    Object.entries(raw).map(([placeId, entry]) => {
      const processed = processRawCoreEntry(placeId, entry);
      if (entry.legacy) {
        return [
          placeId,
          {
            place: processed.place,
            unifiedPolicy: {
              ...entry.legacy,
              date: processed.unifiedPolicy.date,
            },
          },
        ];
      }

      // If legacy is missing, we will have already validated through processRawCoreEntry
      // that there is exactly one new-style reform. We can use that to look up the
      // ExtendedEntry in `entry`, since processed.unifiedPolicy will be missing an ExtendedEntry otherwise.
      if (processed.unifiedPolicy.policy.length !== 1) {
        throw new Error(`Expected exactly one new-style policy in ${placeId}`);
      }
      const policyType = processed.unifiedPolicy.policy[0];
      const policyCollection = {
        "reduce parking minimums": entry.reduce_min,
        "remove parking minimums": entry.rm_min,
        "add parking maximums": entry.rm_min,
      }[policyType];
      if (!policyCollection || policyCollection.length !== 1) {
        throw new Error(`Expected exactly one new-style policy in ${placeId}`);
      }
      const policyRecord = policyCollection[0];

      return [
        placeId,
        {
          place: processed.place,
          unifiedPolicy: {
            ...policyRecord,
            policy: processed.unifiedPolicy.policy,
            date: processed.unifiedPolicy.date,
          },
        },
      ];
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
