import { Page, test } from "@playwright/test";
import { loadMap, assertNumCities, DEFAULT_CITY_RANGE } from "./utils";

interface EdgeCase {
  desc: string;
  scope?: string[];
  policy?: string[];
  land?: string[];
  implementation?: string[];
  populationIntervals?: [number, number];
  noRequirements?: boolean;
  expectedRange: [number, number];
}

// The expected ranges can be updated as the data is updated!
const TESTS: EdgeCase[] = [
  { desc: "default filters", expectedRange: DEFAULT_CITY_RANGE },
  { desc: "disabled filter", scope: [], expectedRange: [0, 0] },
  { desc: "scope filter", scope: ["Regional"], expectedRange: [3, 6] },
  {
    desc: "policy change filter",
    policy: ["Parking Maximums"],
    expectedRange: [125, 160],
  },
  { desc: "land use filter", land: ["Residential"], expectedRange: [15, 22] },
  {
    desc: "implementation filter",
    implementation: ["Repealed"],
    expectedRange: [1, 2],
  },
  {
    desc: "population slider",
    populationIntervals: [4, 8],
    expectedRange: [580, 700],
  },
  {
    desc: "no requirements",
    noRequirements: true,
    expectedRange: [45, 55],
  },
  {
    desc: "all cities",
    // The other filters already enable all options by default.
    policy: [
      "Reduce Parking Minimums",
      "Eliminate Parking Minimums",
      "Parking Maximums",
    ],
    implementation: [
      "Implemented",
      "Passed",
      "Planned",
      "Proposed",
      "Repealed",
    ],
    expectedRange: [1850, 2200],
  },
];

const selectIfSet = async (
  page: Page,
  selector: string,
  values?: string[]
): Promise<void> => {
  if (values !== undefined) {
    // Reset filters by unchecking all
    const checkboxes = await page.$$(
      `input[type="checkbox"][name="${selector}"]`
    );
    /* eslint-disable */
    for (const checkbox of checkboxes) {
      await checkbox.uncheck();
    }

    for (const value of values) {
      const label = await page.$(`label:has-text("${value}")`);
      const checkbox = await label.$('input[type="checkbox"]');
      await checkbox.check();
    }
    /* eslint-enable */
  }
};

for (const edgeCase of TESTS) {
  test(`${edgeCase.desc}`, async ({ page }) => {
    await loadMap(page);

    // Deal with the requirements toggle before the filter popup, since the
    // filter popup covers it.
    if (edgeCase.noRequirements !== undefined) {
      await page.locator("#no-requirements-toggle").check();
    }

    await page.locator(".filters-popup-icon").click();

    await selectIfSet(page, "scope", edgeCase.scope);
    await selectIfSet(page, "policy-change", edgeCase.policy);
    await selectIfSet(page, "land-use", edgeCase.land);
    await selectIfSet(page, "implementation-stage", edgeCase.implementation);

    if (edgeCase.populationIntervals !== undefined) {
      const [leftInterval, rightInterval] = edgeCase.populationIntervals;
      await page
        .locator(".population-slider-left")
        .fill(leftInterval.toString());
      await page
        .locator(".population-slider-right")
        .fill(rightInterval.toString());
    }

    await assertNumCities(page, edgeCase.expectedRange);
  });
}
