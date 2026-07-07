import { expect, test } from "@playwright/test";

import {
  getCitations,
  readRawCompleteData,
  readRawCoreData,
  readRawExtendedData,
} from "../../scripts/lib/data";

// These tests guard the real, synced-from-Directus JSON files against silent data loss.
test.describe("data integrity", () => {
  test("core, extended, and complete data have the same, plausible number of entries", async () => {
    const core = await readRawCoreData();
    const extended = await readRawExtendedData();
    const complete = await readRawCompleteData();
    const numCore = Object.keys(core).length;
    const numExtended = Object.keys(extended).length;
    const numComplete = Object.keys(complete).length;

    expect(numCore).toEqual(numExtended);
    expect(numCore).toEqual(numComplete);

    // Feel free to increase this number as we add more places.
    expect(numCore).toBeGreaterThan(6000);
  });

  test("every attachment has a Directus ID", async () => {
    const extendedData = await readRawExtendedData();
    const missingFileNames = Object.values(extendedData).flatMap((entry) =>
      getCitations(entry).flatMap((citation) =>
        citation.attachments
          .filter((attachment) => !attachment.directusId)
          .map((attachment) => attachment.fileName),
      ),
    );
    expect(missingFileNames).toEqual([]);
  });
});
