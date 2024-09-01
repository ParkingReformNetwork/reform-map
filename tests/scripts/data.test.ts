import { expect, test } from "@playwright/test";

import {
  escapePlaceId,
  readCompleteData,
  readCoreData,
  readExtendedData,
} from "../../scripts/lib/data";

test("escapePlaceID", () => {
  expect(escapePlaceId("Tucson, AZ")).toEqual("Tucson_AZ");
  expect(escapePlaceId("St. Lucia, AZ")).toEqual("St.Lucia_AZ");
});

test("JSON files have enough entries", async () => {
  const core = await readCoreData();
  const extended = await readExtendedData();
  const complete = await readCompleteData();
  const numCore = Object.keys(core).length;
  const numExtended = Object.keys(extended).length;
  const numComplete = Object.keys(complete).length;

  expect(numCore).toEqual(numExtended);
  expect(numCore).toEqual(numComplete);

  expect(numCore).toBeGreaterThan(3000);
});
