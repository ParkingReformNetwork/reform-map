import fs from "fs/promises";

import { RawEntry, PlaceId } from "../../src/js/types";

export type Attachment = {
  fileName: string;
  directusId: string;
  isDoc: boolean;
};

export type CitationType = "city code" | "media report" | "other";

export type Citation = {
  description: string;
  type: CitationType;
  url: string | null;
  notes: string | null;
  attachments: Attachment[];
};

export type ExtendedEntry = {
  legacy: {
    reporter: string | null;
    requirements: string[];
    citations: Citation[];
  };
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
      {
        place: core.place,
        legacy: { ...core.legacy, ...extendedData[placeId].legacy },
      },
    ]),
  );
}
