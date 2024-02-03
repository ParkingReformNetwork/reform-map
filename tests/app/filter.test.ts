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
    expectedRange: [322, 375],
  },
  { desc: "land use filter", land: ["Residential"], expectedRange: [66, 90] },
  {
    desc: "implementation filter",
    implementation: ["Repealed"],
    expectedRange: [1, 2],
  },
  {
    desc: "population slider",
    populationIntervals: [3, 6],
    expectedRange: [210, 300],
  },
  {
    desc: "no requirements",
    noRequirements: true,
    expectedRange: [50, 65],
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
    const checkboxesUncheck = await page.$$(
      `input[type="checkbox"][name="${selector}"]`
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
      })
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

    // Default has requirement toggle on, so first de-select it, but opening filter pop-up and clicking toggle.
    await page.locator(".filters-popup-icon").click();
    await page.locator("#no-requirements-toggle").click({ force: true });

    if (edgeCase.noRequirements !== undefined) {
      // Force clicking because the checkbox is hidden (opacity: 0)
      await page.locator("#no-requirements-toggle").click({ force: true });
    }

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
