import fs from "fs/promises";

import { DateTime } from "luxon";

import { RawEntry, PlaceId } from "../../src/js/types";

export type Attachment = {
  url: string;
  fileName: string;
  isDoc: boolean;
  outputPath: string;
};

export type Citation = {
  idx: number;
  description: string;
  type: string;
  url: string;
  notes: string;
  lastUpdated: DateTime<true>;
  attachments: Attachment[];
};

export type ExtendedEntry = {
  reporter: string | null;
  updated: string;
};

export type CompleteEntry = RawEntry & ExtendedEntry;

export async function readCoreData(): Promise<Record<PlaceId, RawEntry>> {
  const raw = await fs.readFile("data/core.json", "utf8");
  return JSON.parse(raw);
}

export async function readExtendedData(): Promise<
  Record<PlaceId, ExtendedEntry>
> {
  const raw = await fs.readFile("data/extended.json", "utf8");
  return JSON.parse(raw);
}

export async function readCompleteData(): Promise<
  Record<PlaceId, CompleteEntry>
> {
  const [coreData, extendedData] = await Promise.all([
    readCoreData(),
    readExtendedData(),
  ]);
  return Object.fromEntries(
    Object.entries(coreData).map(([placeId, core]) => [
      placeId,
      { ...core, ...extendedData[placeId] },
    ]),
  );
}
