import { expect, test } from "@playwright/test";

import {
  readCompleteData,
  readCoreData,
  readExtendedData,
} from "../../scripts/lib/data";

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
