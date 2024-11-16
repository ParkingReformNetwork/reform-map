import fs from "fs/promises";

import { RawEntry, PlaceId } from "../../src/js/types";

export type Attachment = {
  fileName: string;
  isDoc: boolean;
  outputPath: string;
};

export type CitationType = "city code" | "media report" | "other";

export type Citation = {
  description: string | null;
  type: string | null;
  url: string | null;
  notes: string | null;
  attachments: Attachment[];
};

export type ExtendedEntry = {
  reporter: string | null;
  requirements: string[];
  citations: Citation[];
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

export async function saveCoreData(
  data: Record<PlaceId, RawEntry>,
): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile("data/core.json", json);
}

export function splitStringArray(
  val: string,
  transform: Record<string, string> = {},
): string[] {
  return val.split(", ").map((v) => {
    const lowercase = v.toLowerCase();
    return transform[lowercase] ?? lowercase;
  });
}
