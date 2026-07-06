import { expect, type Page, test } from "@playwright/test";
import type { ReformStatus } from "../../src/js/model/types";
import type { PolicyTypeFilter } from "../../src/js/state/FilterState";
import {
  assertNumPlaces,
  DEFAULT_ALL_MINIMUMS_RANGE,
  DEFAULT_PLACE_RANGE,
  getTotalNumPlaces,
  loadMap,
  openFilter,
  selectToggle,
} from "./utils";

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
    expectedRange: [2000, 4000],
  },
  {
    desc: "default: remove",
    policyTypeFilter: "remove parking minimums",
    expectedRange: [3400, 5000],
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

async function selectIfSet(
  page: Page,
  selector: string,
  values?: StringArrayOption,
): Promise<void> {
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
}

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

// `FilterState`'s option Sets are a single unified view across every dataset, so
// checked-but-hidden values must persist when the user switches datasets.
// "Uncheck all" therefore may only drop the options *visible* in the current
// dataset — not options that exist solely in a different dataset. A regression to
// naive `new Set()` semantics would wipe the entire set and silently reset the
// other datasets' selections.
//
// The specific years below can be updated as the data changes: "1960" must be a
// year present only in "reduce parking minimums", and "2020" a year present in
// both it and "remove parking minimums".
test("uncheck-all only affects the current dataset's options", async ({
  page,
}) => {
  await loadMap(page);
  await openFilter(page);

  // In the "remove parking minimums" dataset, uncheck all of its year options.
  await page
    .locator("#filter-policy-type-dropdown")
    .selectOption("remove parking minimums");
  await page.locator("#filter-accordion-toggle-year").click();
  await page.locator("#filter-year-uncheck-all").click();

  // Switch to the "reduce parking minimums" dataset, whose year options differ.
  await page
    .locator("#filter-policy-type-dropdown")
    .selectOption("reduce parking minimums");

  // "1960" exists only in this dataset, so uncheck-all above never touched it.
  await expect(
    page.locator('.filter-year input[data-value="1960"]'),
  ).toBeChecked();
  // "2020" exists in both datasets, so uncheck-all above did remove it.
  await expect(
    page.locator('.filter-year input[data-value="2020"]'),
  ).not.toBeChecked();
});
