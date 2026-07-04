import { readFile } from "fs/promises";

import { expect, test } from "@playwright/test";

import { SAMPLE_PLACES } from "../../scripts/lib/samplePlaces";

// This test uses snapshot testing (https://jestjs.io/docs/snapshot-testing#updating-snapshots). If the tests fail and the changes
// are valid, run `npm test -- --updateSnapshot`.

// eslint-disable-next-line no-empty-pattern
test("generate html page", async ({}, testInfo) => {
  // Normally, Playwright saves the operating system name in the snapshot results.
  // Our test is OS-independent, so turn this off.
  // eslint-disable-next-line no-param-reassign
  testInfo.snapshotSuffix = "";

  await Promise.all(
    SAMPLE_PLACES.map(async ({ encodedId }) => {
      const content = await readFile(`city_detail/${encodedId}.html`);
      const snapshotName = encodedId.toLowerCase().replace("_", "-");
      expect(content).toMatchSnapshot(`${snapshotName}.html`);
    }),
  );
});
