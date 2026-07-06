import { expect, test } from "@playwright/test";
import { generateScorecard } from "../../src/js/map-features/scorecard";
import type {
  ProcessedCoreBenefitDistrict,
  ProcessedCoreEntry,
  ProcessedCoreLandUsePolicy,
} from "../../src/js/model/types";
import { loadMap, makePlace, onScreenMarkerPoints } from "./utils";

// This test uses snapshot testing (https://jestjs.io/docs/snapshot-testing#updating-snapshots). If the tests fail and the changes
// are valid, run `npm test -- --updateSnapshot`.

test("scorecard pops up and closes", async ({ page }) => {
  await loadMap(page);
  const closeIcon = page.locator(".scorecard-close-icon-container");
  const scorecard = page.locator(".scorecard-container");

  // Markers render on the canvas, so we click them at their projected pixel
  // coordinates rather than via a DOM selector.
  const points = await onScreenMarkerPoints(page);
  const firstMarker = points[0];
  const secondMarker = points[points.length - 1];
  expect(firstMarker).not.toEqual(secondMarker);

  // click on marker
  await page.mouse.click(firstMarker.x, firstMarker.y);
  await expect(scorecard).toBeVisible();
  // close popup
  await closeIcon.click();
  await expect(scorecard).toBeHidden();

  // click on marker
  await page.mouse.click(firstMarker.x, firstMarker.y);
  await expect(scorecard).toBeVisible();
  // click on another marker
  await page.mouse.click(secondMarker.x, secondMarker.y);
  await expect(scorecard).toBeVisible();
  // close popup
  await closeIcon.click();
  await expect(scorecard).toBeHidden();

  // click on marker
  await page.mouse.click(firstMarker.x, firstMarker.y);
  await expect(scorecard).toBeVisible();
  // click outside of popup (not a marker either)
  await page.click("#map-counter");
  await expect(scorecard).toBeHidden();
});

// biome-ignore lint/correctness/noEmptyPattern: Playwright requires the fixtures arg to be an object destructuring pattern.
test("generateScorecard()", ({}, testInfo) => {
  // Normally, Playwright saves the operating system name in the snapshot results.
  // Our test is OS-independent, so turn this off.
  testInfo.snapshotSuffix = "";

  const place = makePlace({
    name: "My City",
    state: "Arizona",
    pop: 245132,
    repeal: true,
    url: "https://my-site.org",
  });
  const landUsePolicy: ProcessedCoreLandUsePolicy = {
    status: "adopted",
    scope: [],
    land: [],
    date: undefined,
  };
  const benefitDistrict: ProcessedCoreBenefitDistrict = {
    status: "proposed",
    date: undefined,
  };

  expect(
    generateScorecard({
      place,
      add_max: [landUsePolicy],
    }),
  ).toMatchSnapshot("scorecard-basic.html");

  const repealed: ProcessedCoreEntry = {
    place: { ...place, repeal: false },
    add_max: [
      { ...landUsePolicy, status: "repealed" },
      { ...landUsePolicy, status: "proposed" },
    ],
    rm_min: [landUsePolicy],
    benefit_district: [benefitDistrict],
  };
  expect(generateScorecard(repealed)).toMatchSnapshot(
    "scorecard-repealed.html",
  );
});
