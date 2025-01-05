/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-await-in-loop */

import { Page, test } from "@playwright/test";

import {
  loadMap,
  assertNumPlaces,
  deselectToggle,
  DEFAULT_PLACE_RANGE,
  getTotalNumPlaces,
  openFilter,
  DEFAULT_ALL_MINIMUMS_RANGE,
} from "./utils";
import { PolicyTypeFilter } from "../../src/js/FilterState";

type StringArrayOption = string[] | "all";

interface EdgeCase {
  desc: string;
  policyTypeFilter: PolicyTypeFilter;
  scope?: StringArrayOption;
  includedPolicy?: StringArrayOption;
  land?: StringArrayOption;
  status?: StringArrayOption;
  country?: StringArrayOption;
  year?: StringArrayOption;
  placeType?: StringArrayOption;
  populationIntervals?: [number, number];
  allMinimumsRemoved?: boolean;
  expectedRange: [number, number] | "all";
}

const EXPECTED_MAX_RANGE: [number, number] = [760, 1100];

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
    expectedRange: [1125, 1700],
  },
  {
    desc: "default: remove",
    policyTypeFilter: "remove parking minimums",
    expectedRange: [2200, 2700],
  },
  {
    desc: "default: max",
    policyTypeFilter: "add parking maximums",
    expectedRange: EXPECTED_MAX_RANGE,
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
    expectedRange: [500, 800],
  },
  {
    desc: "all minimums removed",
    policyTypeFilter: "any parking reform",
    allMinimumsRemoved: true,
    expectedRange: DEFAULT_ALL_MINIMUMS_RANGE,
  },
  {
    desc: "scope filter",
    policyTypeFilter: "add parking maximums",
    scope: ["City center / business district"],
    expectedRange: [130, 350],
  },
  {
    desc: "land use filter",
    policyTypeFilter: "remove parking minimums",
    land: ["Residential, all uses"],
    expectedRange: [130, 350],
  },
  {
    desc: "status filter",
    policyTypeFilter: "remove parking minimums",
    status: ["Repealed"],
    expectedRange: [2, 10],
  },
  {
    desc: "year filter",
    policyTypeFilter: "remove parking minimums",
    year: ["1952"],
    expectedRange: [1, 2],
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

    if (
      edgeCase.allMinimumsRemoved !== true &&
      edgeCase.policyTypeFilter !== "reduce parking minimums"
    ) {
      await deselectToggle(page);
    }

    if (edgeCase.policyTypeFilter !== "any parking reform") {
      await page
        .locator("#filter-policy-type-dropdown")
        .selectOption(edgeCase.policyTypeFilter);
    }

    await selectIfSet(page, "scope", edgeCase.scope);
    await selectIfSet(page, "policy-change", edgeCase.includedPolicy);
    await selectIfSet(page, "land-use", edgeCase.land);
    await selectIfSet(page, "status", edgeCase.status);
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
