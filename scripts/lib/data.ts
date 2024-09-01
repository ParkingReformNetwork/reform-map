import fs from "fs/promises";

import { RawEntry, PlaceId } from "../../src/js/types";

export async function readCoreData(): Promise<Record<PlaceId, RawEntry>> {
  const raw = await fs.readFile("data/core.json", "utf8");
  return JSON.parse(raw);
}
