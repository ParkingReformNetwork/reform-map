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
  populationIntervals?: [number, number];
  noRequirements?: boolean;
  expectedRange: [number, number] | "all";
}

// The expected ranges can be updated as the data is updated!
const TESTS: EdgeCase[] = [
  { desc: "default filters", expectedRange: DEFAULT_PLACE_RANGE },
  { desc: "disabled filter", scope: [], expectedRange: [0, 0] },
  { desc: "scope filter", scope: ["Regional"], expectedRange: [8, 20] },
  {
    desc: "policy change filter",
    policy: ["Parking maximums"],
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
    desc: "population slider",
    populationIntervals: [3, 6],
    expectedRange: [480, 700],
  },
  {
    desc: "no requirements",
    noRequirements: true,
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
  if (values !== undefined) {
    // First, expand the accordion
    await page.locator(`#filter-accordion-toggle-${selector}`).click();

    // Reset filters by unchecking all
    const checkboxesUncheck = await page.$$(
      `input[type="checkbox"][name="${selector}"]`,
    );
    // Unable to use Promise.all() because unchecking needs to be sequential
    await checkboxesUncheck.reduce(async (previousPromise, checkbox) => {
      await previousPromise;
      await checkbox.uncheck();
    }, Promise.resolve());

    const checkboxesCheck = await Promise.all(
      values.map(async (value) => {
        const parentElement = await page.$(`label:has-text("${value}")`);
        const checkbox = await parentElement.$('input[type="checkbox"]');
        return checkbox;
      }),
    );
    await checkboxesCheck.reduce(async (previousPromise, checkbox) => {
      await previousPromise;
      await checkbox.check();
    }, Promise.resolve());
  }
};

for (const edgeCase of TESTS) {
  test(`${edgeCase.desc}`, async ({ page }) => {
    await loadMap(page);

    await deselectToggle(page);

    if (edgeCase.noRequirements !== undefined) {
      // Force clicking because the checkbox is hidden (opacity: 0)
      await page.locator("#no-requirements-toggle").click({ force: true });
    }

    await selectIfSet(page, "scope", edgeCase.scope);
    await selectIfSet(page, "policy-change", edgeCase.policy);
    await selectIfSet(page, "land-use", edgeCase.land);
    await selectIfSet(page, "status", edgeCase.status);
    await selectIfSet(page, "country", edgeCase.country);

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
