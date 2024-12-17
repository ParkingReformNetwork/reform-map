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

type StringArrayOption = string[] | "all";

interface EdgeCase {
  desc: string;
  scope?: StringArrayOption;
  policy?: StringArrayOption;
  land?: StringArrayOption;
  status?: StringArrayOption;
  country?: StringArrayOption;
  year?: StringArrayOption;
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
  {
    desc: "land use filter",
    land: ["Residential, all uses"],
    expectedRange: [290, 550],
  },
  {
    desc: "status filter",
    status: ["Repealed"],
    expectedRange: [1, 10],
  },
  {
    desc: "country filter",
    country: ["Mexico"],
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
    status: "all",
    expectedRange: "all",
  },
];

const selectIfSet = async (
  page: Page,
  selector: string,
  values?: StringArrayOption,
): Promise<void> => {
  if (!values) return;

  // First, expand the accordion
  await page.locator(`#filter-accordion-toggle-${selector}`).click();

  if (values === "all") {
    await page.locator(`#filter-${selector}-check-all`).click();
    return;
  }

  // Else, uncheck all options to reset the state.
  await page.locator(`#filter-${selector}-uncheck-all`).click();

  const labelSelector = `.filter-${selector} label`;

  // Then, get the checkboxes we need to check.
  const toClick = await page.evaluate(
    (data) => {
      // eslint-disable-next-line no-shadow
      const { labelSelector, values } = data;
      const indices: number[] = [];
      document.querySelectorAll(labelSelector).forEach((label, index) => {
        const text = label.querySelector("span")?.textContent || "";
        if (values.includes(text)) {
          indices.push(index);
        }
      });
      return indices;
    },
    {
      labelSelector,
      values,
    },
  );

  // Finally, click only the checkboxes we need
  for (const index of toClick) {
    await page.locator(labelSelector).nth(index).click();
  }
};

for (const edgeCase of TESTS) {
  test(`${edgeCase.desc}`, async ({ page }) => {
    await loadMap(page);

    await deselectToggle(page);

    if (edgeCase.allMinimumsRemoved !== undefined) {
      await page.locator("#filter-all-minimums-toggle-container").click();
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
