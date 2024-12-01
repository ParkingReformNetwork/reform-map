import { expect, test } from "@playwright/test";

import { determineHtml } from "../../src/js/counters";
import { FilterState } from "../../src/js/FilterState";

test.describe("determineHtml", () => {
  const DEFAULT_STATE: FilterState = {
    searchInput: null,
    policyTypeFilter: "any parking reform",
    allMinimumsRemovedToggle: false,
    includedPolicyChanges: [],
    scope: [],
    landUse: [],
    status: [],
    country: [],
    year: [],
    populationSliderIndexes: [0, 0],
  };

  test("no places", () => {
    const result = determineHtml(DEFAULT_STATE, 0, 0, new Set());
    expect(result).toEqual(
      "No places selected — use the filter and search icons",
    );
  });

  test("search", () => {
    const result = determineHtml(
      { ...DEFAULT_STATE, searchInput: "My Town" },
      1,
      0,
      new Set(),
    );
    expect(result).toEqual(
      'Showing My Town from search — <a class="counter-search-reset" role="button" aria-label="reset search">reset</a>',
    );
  });

  test("any parking reform", () => {
    const result = determineHtml(DEFAULT_STATE, 5, 0, new Set(["Mexico"]));
    expect(result).toEqual("Showing 5 places in Mexico with parking reforms.");

    const allMinimumsRemoved = determineHtml(
      {
        ...DEFAULT_STATE,
        allMinimumsRemovedToggle: true,
      },
      5,
      0,
      new Set(["Mexico", "Brazil"]),
    );
    expect(allMinimumsRemoved).toEqual(
      "Showing 5 places in 2 countries with all parking minimums removed.",
    );
  });

  test("reduce minimums", () => {
    const result = determineHtml(
      { ...DEFAULT_STATE, policyTypeFilter: "reduce parking minimums" },
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const expected =
      "Showing 5 places in 2 countries with parking minimum reductions. Matched 6 total policy records.";
    expect(result).toEqual(expected);

    // allMinimumsRemovedToggle doesn't matter
    const allMinimumsRemoved = determineHtml(
      {
        ...DEFAULT_STATE,
        policyTypeFilter: "reduce parking minimums",
        allMinimumsRemovedToggle: true,
      },
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    expect(allMinimumsRemoved).toEqual(expected);
  });

  test("remove minimums", () => {
    const result = determineHtml(
      { ...DEFAULT_STATE, policyTypeFilter: "remove parking minimums" },
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    expect(result).toEqual(
      "Showing 5 places in 2 countries with parking minimum removals. Matched 6 total policy records.",
    );

    const allMinimumsRemoved = determineHtml(
      {
        ...DEFAULT_STATE,
        policyTypeFilter: "remove parking minimums",
        allMinimumsRemovedToggle: true,
      },
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    expect(allMinimumsRemoved).toEqual(
      "Showing 5 places in 2 countries with all parking minimums removed.",
    );
  });

  test("add maximums", () => {
    const result = determineHtml(
      { ...DEFAULT_STATE, policyTypeFilter: "add parking maximums" },
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    expect(result).toEqual(
      "Showing 5 places in 2 countries with parking maximums added. Matched 6 total policy records.",
    );

    const allMinimumsRemoved = determineHtml(
      {
        ...DEFAULT_STATE,
        policyTypeFilter: "add parking maximums",
        allMinimumsRemovedToggle: true,
      },
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    expect(allMinimumsRemoved).toEqual(
      "Showing 5 places in 2 countries with both all parking minimums removed and parking maximums added. Matched 6 total parking maximum policy records.",
    );
  });

  test("grammar", () => {
    const result = determineHtml(
      { ...DEFAULT_STATE, policyTypeFilter: "reduce parking minimums" },
      1,
      1,
      new Set(["United States"]),
    );
    expect(result).toEqual(
      "Showing 1 place in the United States with parking minimum reductions. Matched 1 total policy record.",
    );
  });
});
