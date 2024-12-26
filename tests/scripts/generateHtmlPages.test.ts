import { readFile } from "fs/promises";

import { expect, test } from "@playwright/test";

// This test uses snapshot testing (https://jestjs.io/docs/snapshot-testing#updating-snapshots). If the tests fail and the changes
// are valid, run `npm test -- --updateSnapshot`.

// eslint-disable-next-line no-empty-pattern
test("generate html page", async ({}, testInfo) => {
  // Normally, Playwright saves the operating system name in the snapshot results.
  // Our test is OS-independent, so turn this off.
  // eslint-disable-next-line no-param-reassign
  testInfo.snapshotSuffix = "";

  const assertPlace = async (normalizedPlaceId: string): Promise<void> => {
    const content = await readFile(`city_detail/${normalizedPlaceId}.html`);
    const snapshotName = normalizedPlaceId.toLowerCase().replace("_", "-");
    expect(content).toMatchSnapshot(`${snapshotName}.html`);
  };

  await assertPlace("Abilene_TX");
  await assertPlace("Abbottstown_PA");
  await assertPlace("Basalt_CO");
  await assertPlace("Auburn_ME");
});
