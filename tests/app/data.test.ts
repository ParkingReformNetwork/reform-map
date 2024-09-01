import { expect, test } from "@playwright/test";

import { getTotalNumPlaces } from "./utils";

test("JSON file has enough entries", async () => {
  const numEntries = await getTotalNumPlaces();
  expect(numEntries).toBeGreaterThan(3000);
});
