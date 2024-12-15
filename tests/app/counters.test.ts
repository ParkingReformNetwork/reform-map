import { expect, test } from "@playwright/test";

import { determineHtml } from "../../src/js/counters";
import { FilterState } from "../../src/js/FilterState";

test.describe("determineHtml", () => {
  const DEFAULT_STATE: FilterState = {
    searchInput: null,
    policyTypeFilter: "any parking reform",
    allMinimumsRemovedToggle: false,
    includedPolicyChanges: [
      "add parking maximums",
      "remove parking minimums",
      "reduce parking minimums",
    ],
    scope: [],
    landUse: [],
    status: [],
    country: [],
    year: [],
    populationSliderIndexes: [0, 0],
  };

  test("no places", () => {
    const resultMap = determineHtml("map", DEFAULT_STATE, 0, 0, new Set());
    const resultTable = determineHtml("table", DEFAULT_STATE, 0, 0, new Set());
    const expected = "No places selected — use the filter and search icons";
    expect(resultMap).toEqual(expected);
    expect(resultTable).toEqual(expected);
  });

  test("search", () => {
    const state = { ...DEFAULT_STATE, searchInput: "My Town" };
    const resultMap = determineHtml("map", state, 1, 0, new Set());
    const resultTable = determineHtml("table", state, 1, 0, new Set());
    const expected =
      'Showing My Town from search — <a class="counter-search-reset" role="button" aria-label="reset search">reset</a>';
    expect(resultMap).toEqual(expected);
    expect(resultTable).toEqual(expected);
  });

  test("any parking reform", () => {
    const assertMapAndTable = (state: FilterState, expected: string): void => {
      const resultMap = determineHtml("map", state, 5, 0, new Set(["Mexico"]));
      const resultTable = determineHtml(
        "table",
        state,
        5,
        0,
        new Set(["Mexico"]),
      );
      expect(resultMap).toEqual(expected);
      expect(resultTable).toEqual(expected);
    };

    assertMapAndTable(
      DEFAULT_STATE,
      "Showing 5 places in Mexico with parking minimums removed, parking minimums reduced, or parking maximums added",
    );
    assertMapAndTable(
      {
        ...DEFAULT_STATE,
        includedPolicyChanges: [
          "reduce parking minimums",
          "remove parking minimums",
        ],
      },
      "Showing 5 places in Mexico with parking minimums removed or parking minimums reduced",
    );
    assertMapAndTable(
      { ...DEFAULT_STATE, includedPolicyChanges: ["remove parking minimums"] },
      "Showing 5 places in Mexico with parking minimums removed",
    );
    assertMapAndTable(
      { ...DEFAULT_STATE, includedPolicyChanges: ["reduce parking minimums"] },
      "Showing 5 places in Mexico with parking minimums reduced",
    );
    assertMapAndTable(
      { ...DEFAULT_STATE, includedPolicyChanges: ["add parking maximums"] },
      "Showing 5 places in Mexico with parking maximums added",
    );

    assertMapAndTable(
      {
        ...DEFAULT_STATE,
        allMinimumsRemovedToggle: true,
      },
      "Showing 5 places in Mexico with all parking minimums removed",
    );
    assertMapAndTable(
      {
        ...DEFAULT_STATE,
        allMinimumsRemovedToggle: true,
        includedPolicyChanges: ["add parking maximums"],
      },
      "Showing 5 places in Mexico with both all parking minimums removed and parking maximums added",
    );
  });

  test("reduce minimums", () => {
    const state: FilterState = {
      ...DEFAULT_STATE,
      policyTypeFilter: "reduce parking minimums",
    };
    const resultMap = determineHtml(
      "map",
      state,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const resultTableEqualRecords = determineHtml(
      "table",
      state,
      5,
      5,
      new Set(["Mexico", "Brazil"]),
    );
    const resultTableUnequalRecords = determineHtml(
      "table",
      state,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const expectedNoRecords =
      "Showing 5 places in 2 countries with parking minimums reduced";
    const expectedRecords =
      "Showing 5 places in 2 countries with parking minimums reduced. Matched 6 total policy records because some places have multiple records.";
    expect(resultMap).toEqual(expectedNoRecords);
    expect(resultTableEqualRecords).toEqual(expectedNoRecords);
    expect(resultTableUnequalRecords).toEqual(expectedRecords);

    // allMinimumsRemovedToggle doesn't matter
    const allMinimumsRemovedState: FilterState = {
      ...DEFAULT_STATE,
      policyTypeFilter: "reduce parking minimums",
      allMinimumsRemovedToggle: true,
    };
    const allMinimumsRemovedMap = determineHtml(
      "map",
      allMinimumsRemovedState,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const allMinimumsRemovedTableEqualRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      5,
      new Set(["Mexico", "Brazil"]),
    );
    const allMinimumsRemovedTableUnequalRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    expect(allMinimumsRemovedMap).toEqual(expectedNoRecords);
    expect(allMinimumsRemovedTableEqualRecords).toEqual(expectedNoRecords);
    expect(allMinimumsRemovedTableUnequalRecords).toEqual(expectedRecords);
  });

  test("remove minimums", () => {
    const state: FilterState = {
      ...DEFAULT_STATE,
      policyTypeFilter: "remove parking minimums",
    };
    const resultMap = determineHtml(
      "map",
      state,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const resultTableEqualRecords = determineHtml(
      "table",
      state,
      5,
      5,
      new Set(["Mexico", "Brazil"]),
    );
    const resultTableUnequalRecords = determineHtml(
      "table",
      state,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const expectedNoRecords =
      "Showing 5 places in 2 countries with parking minimums removed";
    const expectedRecords =
      "Showing 5 places in 2 countries with parking minimums removed. Matched 6 total policy records because some places have multiple records.";
    expect(resultMap).toEqual(expectedNoRecords);
    expect(resultTableEqualRecords).toEqual(expectedNoRecords);
    expect(resultTableUnequalRecords).toEqual(expectedRecords);

    const allMinimumsRemovedState: FilterState = {
      ...DEFAULT_STATE,
      policyTypeFilter: "remove parking minimums",
      allMinimumsRemovedToggle: true,
    };
    const allMinimumsRemovedMap = determineHtml(
      "map",
      allMinimumsRemovedState,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const allMinimumsRemovedTableEqualRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      5,
      new Set(["Mexico", "Brazil"]),
    );
    const allMinimumsRemovedTableUnequalRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const allMinimumsRemovedExpected =
      "Showing 5 places in 2 countries with all parking minimums removed";
    expect(allMinimumsRemovedMap).toEqual(allMinimumsRemovedExpected);
    expect(allMinimumsRemovedTableEqualRecords).toEqual(
      allMinimumsRemovedExpected,
    );
    expect(allMinimumsRemovedTableUnequalRecords).toEqual(
      allMinimumsRemovedExpected,
    );
  });

  test("add maximums", () => {
    const state: FilterState = {
      ...DEFAULT_STATE,
      policyTypeFilter: "add parking maximums",
    };
    const resultMap = determineHtml(
      "map",
      state,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const resultTableEqualRecords = determineHtml(
      "table",
      state,
      5,
      5,
      new Set(["Mexico", "Brazil"]),
    );
    const resultTableUnequalRecords = determineHtml(
      "table",
      state,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const expectedNoRecords =
      "Showing 5 places in 2 countries with parking maximums added";
    const expectedRecords =
      "Showing 5 places in 2 countries with parking maximums added. Matched 6 total policy records because some places have multiple records.";
    expect(resultMap).toEqual(expectedNoRecords);
    expect(resultTableEqualRecords).toEqual(expectedNoRecords);
    expect(resultTableUnequalRecords).toEqual(expectedRecords);

    const allMinimumsRemovedState: FilterState = {
      ...DEFAULT_STATE,
      policyTypeFilter: "add parking maximums",
      allMinimumsRemovedToggle: true,
    };
    const allMinimumsRemovedMap = determineHtml(
      "map",
      allMinimumsRemovedState,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const allMinimumsRemovedTableEqualRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      5,
      new Set(["Mexico", "Brazil"]),
    );
    const allMinimumsRemovedTableUnequalRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      6,
      new Set(["Mexico", "Brazil"]),
    );
    const allMinimumsRemovedExpectedEqualRecords =
      "Showing 5 places in 2 countries with both all parking minimums removed and parking maximums added";
    const allMinimumsRemovedExpectedUnequalRecords =
      "Showing 5 places in 2 countries with both all parking minimums removed and parking maximums added. Matched 6 total parking maximum policy records because some places have multiple records.";
    expect(allMinimumsRemovedMap).toEqual(
      allMinimumsRemovedExpectedEqualRecords,
    );
    expect(allMinimumsRemovedTableEqualRecords).toEqual(
      allMinimumsRemovedExpectedEqualRecords,
    );
    expect(allMinimumsRemovedTableUnequalRecords).toEqual(
      allMinimumsRemovedExpectedUnequalRecords,
    );
  });

  test("grammar", () => {
    const result = determineHtml(
      "table",
      { ...DEFAULT_STATE, policyTypeFilter: "reduce parking minimums" },
      1,
      2,
      new Set(["United States"]),
    );
    expect(result).toEqual(
      "Showing 1 place in the United States with parking minimums reduced. Matched 2 total policy records because some places have multiple records.",
    );
  });
});
