import { promises as fs } from "fs";

import { expect, test } from "@playwright/test";

test("CSV file has enough entries", async () => {
  const csv = await fs.readFile("map/data.csv", "utf8");
  const numLines = csv.split("\n").length;
  expect(numLines).toBeGreaterThan(2800);
});
