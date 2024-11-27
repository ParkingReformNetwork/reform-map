import fs from "fs/promises";

import {
  RawCoreEntry,
  PlaceId,
  ProcessedCoreEntry,
  Place,
  RawLegacyReform,
  Date,
} from "../../src/js/types";
import { placeIdToUrl } from "../../src/js/data";

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
  legacy: ExtendedPolicy;
};
export interface RawCompleteEntry {
  place: Place;
  legacy: RawLegacyReform & ExtendedPolicy;
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

export async function readRawCompleteData(): Promise<
  Record<PlaceId, RawCompleteEntry>
> {
  const [coreData, extendedData] = await Promise.all([
    readRawCoreData(),
    readRawExtendedData(),
  ]);
  return Object.fromEntries(
    Object.entries(coreData).map(([placeId, entry]) => [
      placeId,
      {
        place: entry.place,
        legacy: { ...entry.legacy, ...extendedData[placeId].legacy },
      },
    ]),
  );
}

export async function readProcessedCompleteData(): Promise<
  Record<PlaceId, ProcessedCompleteEntry>
> {
  const raw = await readRawCompleteData();
  return Object.fromEntries(
    Object.entries(raw).map(([placeId, entry]) => {
      return [
        placeId,
        {
          place: { ...entry.place, url: placeIdToUrl(placeId) },
          unifiedPolicy: {
            ...entry.legacy,
            date: Date.fromNullable(entry.legacy.date),
          },
        },
      ];
    }),
  );
}
