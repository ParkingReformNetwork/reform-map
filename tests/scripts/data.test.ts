import { expect, test } from "@playwright/test";

import {
  readRawCompleteData,
  readRawCoreData,
  readRawExtendedData,
} from "../../scripts/lib/data";

test("JSON files have enough entries", async () => {
  const core = await readRawCoreData();
  const extended = await readRawExtendedData();
  const complete = await readRawCompleteData();
  const numCore = Object.keys(core).length;
  const numExtended = Object.keys(extended).length;
  const numComplete = Object.keys(complete).length;

  expect(numCore).toEqual(numExtended);
  expect(numCore).toEqual(numComplete);

  expect(numCore).toBeGreaterThan(3000);
});

test("every attachment has a Directus ID", async () => {
  const extendedData = await readRawExtendedData();
  const missingFileNames = Object.values(extendedData).flatMap((entry) =>
    entry.legacy.citations.flatMap((citation) =>
      citation.attachments
        .filter((attachment) => !attachment.directusId)
        .map((attachment) => attachment.fileName),
    ),
  );
  expect(missingFileNames).toEqual([]);
});
