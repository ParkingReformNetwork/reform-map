/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import { Page, test } from "@playwright/test";

import {
  loadMap,
  assertNumPlaces,
  deselectToggle,
  DEFAULT_PLACE_RANGE,
  getTotalNumPlaces,
} from "./utils";

interface EdgeCase {
  desc: string;
  scope?: string[];
  policy?: string[];
  land?: string[];
  status?: string[];
  country?: string[];
  year?: string[];
  populationIntervals?: [number, number];
  allMinimumsRemoved?: boolean;
  expectedRange: [number, number] | "all";
}

// The expected ranges can be updated as the data is updated!
const TESTS: EdgeCase[] = [
  { desc: "default filters", expectedRange: DEFAULT_PLACE_RANGE },
  { desc: "disabled filter", scope: [], expectedRange: [0, 0] },
  { desc: "scope filter", scope: ["Regional"], expectedRange: [8, 20] },
  {
    desc: "policy change filter",
    policy: ["Add parking maximums"],
    expectedRange: [700, 1100],
  },
  { desc: "land use filter", land: ["Residential"], expectedRange: [320, 550] },
  {
    desc: "status filter",
    status: ["Repealed"],
    expectedRange: [1, 10],
  },
  {
    desc: "country filter",
    country: ["MX"],
    expectedRange: [2, 7],
  },
  {
    desc: "year filter",
    year: ["1952"],
    expectedRange: [1, 1],
  },
  {
    desc: "population slider",
    populationIntervals: [3, 6],
    expectedRange: [480, 700],
  },
  {
    desc: "all minimums removed",
    allMinimumsRemoved: true,
    expectedRange: [80, 250],
  },
  {
    desc: "all places",
    // The other filters already enable all options by default.
    status: [
      "Implemented",
      "Passed",
      "Planned",
      "Proposed",
      "Repealed",
      "Unverified",
    ],
    expectedRange: "all",
  },
];

const selectIfSet = async (
  page: Page,
  selector: string,
  values?: string[],
): Promise<void> => {
  if (!values) return;

  // First, expand the accordion
  await page.locator(`#filter-accordion-toggle-${selector}`).click();

  const labels = page.locator(`.filter-${selector} label`);
  const count = await labels.count();

  for (let i = 0; i < count; i += 1) {
    const label = labels.nth(i);
    const text = await label.locator("span").innerText();
    const isChecked = await label.locator('input[type="checkbox"]').isChecked();
    if (
      (isChecked && !values.includes(text)) ||
      (!isChecked && values.includes(text))
    ) {
      await label.click();
    }
  }
};

for (const edgeCase of TESTS) {
  test(`${edgeCase.desc}`, async ({ page }) => {
    await loadMap(page);

    await deselectToggle(page);

    if (edgeCase.allMinimumsRemoved !== undefined) {
      // Force clicking because the checkbox is hidden (opacity: 0)
      await page.locator("#all-minimums-removed-toggle").click({ force: true });
    }

    await selectIfSet(page, "scope", edgeCase.scope);
    await selectIfSet(page, "policy-change", edgeCase.policy);
    await selectIfSet(page, "land-use", edgeCase.land);
    await selectIfSet(page, "status", edgeCase.status);
    await selectIfSet(page, "country", edgeCase.country);
    await selectIfSet(page, "year", edgeCase.year);

    if (edgeCase.populationIntervals !== undefined) {
      const [leftInterval, rightInterval] = edgeCase.populationIntervals;
      await page
        .locator(".population-slider-left")
        .fill(leftInterval.toString());
      await page
        .locator(".population-slider-right")
        .fill(rightInterval.toString());
    }

    if (edgeCase.expectedRange === "all") {
      const expected = await getTotalNumPlaces();
      await assertNumPlaces(page, [expected, expected]);
    } else {
      await assertNumPlaces(page, edgeCase.expectedRange);
    }
  });
}
