/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import { Page, test } from "@playwright/test";

import {
  loadMap,
  assertNumPlaces,
  selectToggle,
  DEFAULT_PLACE_RANGE,
  getTotalNumPlaces,
  openFilter,
  DEFAULT_ALL_MINIMUMS_RANGE,
} from "./utils";
import { PolicyTypeFilter } from "../../src/js/state/FilterState";
import { ReformStatus } from "../../src/js/model/types";

type StringArrayOption = string[] | "all";

interface EdgeCase {
  desc: string;
  policyTypeFilter: PolicyTypeFilter;
  status?: ReformStatus;
  scope?: StringArrayOption;
  includedPolicy?: StringArrayOption;
  land?: StringArrayOption;
  country?: StringArrayOption;
  year?: StringArrayOption;
  placeType?: StringArrayOption;
  populationIntervals?: [number, number];
  allMinimumsRemoved?: boolean;
  expectedRange: [number, number] | "all";
}

const EXPECTED_MAX_RANGE: [number, number] = [1200, 1600];

// The expected ranges can be updated as the data is updated!
const TESTS: EdgeCase[] = [
  {
    desc: "default: any",
    policyTypeFilter: "any parking reform",
    expectedRange: DEFAULT_PLACE_RANGE,
  },
  {
    desc: "default: reduce",
    policyTypeFilter: "reduce parking minimums",
    expectedRange: [1920, 2800],
  },
  {
    desc: "default: remove",
    policyTypeFilter: "remove parking minimums",
    expectedRange: [2800, 3400],
  },
  {
    desc: "default: max",
    policyTypeFilter: "add parking maximums",
    expectedRange: EXPECTED_MAX_RANGE,
  },
  {
    desc: "default: benefit district",
    policyTypeFilter: "parking benefit district",
    expectedRange: [3, 25],
  },
  {
    desc: "disabled filter",
    policyTypeFilter: "any parking reform",
    country: [],
    expectedRange: [0, 0],
  },
  {
    desc: "any reform: policy change filter",
    policyTypeFilter: "any parking reform",
    includedPolicy: ["Add parking maximums"],
    expectedRange: EXPECTED_MAX_RANGE,
  },
  {
    desc: "country filter",
    policyTypeFilter: "any parking reform",
    country: ["Mexico"],
    expectedRange: [2, 7],
  },
  {
    desc: "place type filter",
    policyTypeFilter: "any parking reform",
    placeType: ["Country"],
    expectedRange: [6, 14],
  },
  {
    desc: "population slider",
    policyTypeFilter: "any parking reform",
    populationIntervals: [3, 6],
    expectedRange: [600, 1200],
  },
  {
    desc: "all minimums removed",
    policyTypeFilter: "remove parking minimums",
    allMinimumsRemoved: true,
    expectedRange: DEFAULT_ALL_MINIMUMS_RANGE,
  },
  {
    desc: "scope filter",
    policyTypeFilter: "add parking maximums",
    scope: ["City center / business district"],
    expectedRange: [150, 400],
  },
  {
    desc: "land use filter",
    policyTypeFilter: "remove parking minimums",
    land: ["Residential, all uses"],
    expectedRange: [150, 400],
  },
  {
    desc: "status filter",
    policyTypeFilter: "remove parking minimums",
    status: "repealed",
    expectedRange: [2, 10],
  },
  {
    desc: "year filter",
    policyTypeFilter: "remove parking minimums",
    year: ["1952"],
    expectedRange: [1, 4],
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
    await openFilter(page);

    if (edgeCase.policyTypeFilter !== "any parking reform") {
      await page
        .locator("#filter-policy-type-dropdown")
        .selectOption(edgeCase.policyTypeFilter);
    }

    if (edgeCase.status && edgeCase.status !== "adopted") {
      await page
        .locator("#filter-status-dropdown")
        .selectOption(edgeCase.status);
    }

    if (edgeCase.allMinimumsRemoved === true) {
      await selectToggle(page);
    }

    await selectIfSet(page, "scope", edgeCase.scope);
    await selectIfSet(page, "policy-change", edgeCase.includedPolicy);
    await selectIfSet(page, "land-use", edgeCase.land);
    await selectIfSet(page, "country", edgeCase.country);
    await selectIfSet(page, "year", edgeCase.year);
    await selectIfSet(page, "place-type", edgeCase.placeType);

    if (edgeCase.populationIntervals !== undefined) {
      const [leftInterval, rightInterval] = edgeCase.populationIntervals;
      await page.locator("#filter-accordion-toggle-population-slider").click();
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
