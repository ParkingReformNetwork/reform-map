import { expect, test } from "@playwright/test";

import { loadMap } from "./utils";
import { generateScorecard } from "../../src/js/map-features/scorecard";
import {
  ProcessedCoreBenefitDistrict,
  ProcessedCoreEntry,
  ProcessedCoreLandUsePolicy,
  ProcessedPlace,
} from "../../src/js/model/types";

test("scorecard pops up and closes", async ({ page }) => {
  await loadMap(page);
  const closeIcon = page.locator(".scorecard-close-icon-container");

  const scorecardIsVisible = async () =>
    page.$eval(
      ".scorecard-container",
      (el) => el instanceof HTMLElement && !el.hidden,
    );

  // click on marker
  await page.locator(".leaflet-interactive").first().click({ force: true });
  expect(await scorecardIsVisible()).toBe(true);
  // close popup
  await closeIcon.click();
  expect(await scorecardIsVisible()).toBe(false);

  // click on marker
  await page.locator("path:nth-child(4)").click({ force: true });
  expect(await scorecardIsVisible()).toBe(true);
  // click on another marker
  await page.locator("path:nth-child(8)").click({ force: true });
  expect(await scorecardIsVisible()).toBe(true);
  // close popup
  await closeIcon.click();
  expect(await scorecardIsVisible()).toBe(false);

  // click on marker
  await page.locator(".leaflet-interactive").first().click({ force: true });
  expect(await scorecardIsVisible()).toBe(true);
  // click outside of popup (not a marker either)
  await page.click("#map");
  expect(await scorecardIsVisible()).toBe(false);
});

test("generateScorecard()", () => {
  const place: ProcessedPlace = {
    name: "My City",
    state: "Arizona",
    country: "United States",
    type: "city",
    pop: 245132,
    repeal: true,
    coord: [0, 0],
    url: "https://my-site.org",
  };
  const landUsePolicy: ProcessedCoreLandUsePolicy = {
    status: "adopted",
    scope: [],
    land: [],
    date: null,
  };
  const benefitDistrict: ProcessedCoreBenefitDistrict = {
    status: "proposed",
    date: null,
  };

  expect(
    generateScorecard(
      {
        place,
        add_max: [landUsePolicy],
      },
    ),
  ).toEqual(
    `
    <header class="scorecard-header">
      <h2 class="scorecard-title">My City<br/><span class="scorecard-supplemental-place-info">Arizona, United States</span></h2>
      <button
        class="scorecard-close-icon-container"
        title="close the place details popup"
        aria-label="close the place details popup"
      >
        <i class="fa-regular fa-circle-xmark" aria-hidden="true"></i>
      </button>
    </header>
    <ul>
      <li>245,132 residents</li>
      <li>All parking minimums removed</li>
    </ul>
    <div>Reform types:</div><ul><li>Add parking maximums</li></ul>
    <a class="external-link" target="_blank" href=https://my-site.org>Details and citations <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>
    `,
  );

  const repealed: ProcessedCoreEntry = {
    place: { ...place, repeal: false },
    add_max: [
      { ...landUsePolicy, status: "repealed" },
      { ...landUsePolicy, status: "proposed" },
    ],
    rm_min: [landUsePolicy],
    benefit_district: [benefitDistrict],
  };
  expect(generateScorecard(repealed)).toEqual(
    `
    <header class="scorecard-header">
      <h2 class="scorecard-title">My City<br/><span class="scorecard-supplemental-place-info">Arizona, United States</span></h2>
      <button
        class="scorecard-close-icon-container"
        title="close the place details popup"
        aria-label="close the place details popup"
      >
        <i class="fa-regular fa-circle-xmark" aria-hidden="true"></i>
      </button>
    </header>
    <ul>
      <li>245,132 residents</li>
      
    </ul>
    <div>Reform types:</div><ul><li>Add parking maximums (proposed and repealed)</li><li>Remove parking minimums (adopted)</li><li>Parking benefit district (proposed)</li></ul>
    <a class="external-link" target="_blank" href=https://my-site.org>Details and citations <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>
    `,
  );
});
