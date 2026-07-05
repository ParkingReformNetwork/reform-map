import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

import { SAMPLE_PLACES } from "../../scripts/lib/samplePlaces";

// This test uses snapshot testing (https://jestjs.io/docs/snapshot-testing#updating-snapshots). If the tests fail and the changes
// are valid, run `npm test -- --updateSnapshot`.

// biome-ignore lint/correctness/noEmptyPattern: Playwright requires the fixtures arg to be an object destructuring pattern.
test("generate html page", async ({}, testInfo) => {
  // Normally, Playwright saves the operating system name in the snapshot results.
  // Our test is OS-independent, so turn this off.
  testInfo.snapshotSuffix = "";

  await Promise.all(
    SAMPLE_PLACES.map(async ({ encodedId }) => {
      const content = await readFile(`city_detail/${encodedId}.html`);
      const snapshotName = encodedId.toLowerCase().replace("_", "-");
      expect(content).toMatchSnapshot(`${snapshotName}.html`);
    }),
  );
});
