import { promises as fs } from "fs";

import { expect, test } from "@playwright/test";

test("CSV files have enough entries", async () => {
  const assert = async (fp: string): Promise<void> => {
    const csv = await fs.readFile(fp, "utf8");
    const numLines = csv.split("\n").length;
    expect(numLines).toBeGreaterThan(1900);
  };

  await assert("map/tidied_map_data.csv");
  await assert("map/trimmed_map_data.csv");
});
