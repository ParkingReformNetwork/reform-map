import { expect, test } from "@playwright/test";

import { determineHtml } from "../../src/js/counters";
import { FilterState } from "../../src/js/FilterState";
import { PolicyType } from "../../src/js/types";

test.describe("determineHtml", () => {
  const DEFAULT_STATE: FilterState = {
    searchInput: null,
    policyTypeFilter: "any parking reform",
    allMinimumsRemovedToggle: false,
    includedPolicyChanges: new Set([
      "add parking maximums",
      "remove parking minimums",
      "reduce parking minimums",
    ]),
    // The below values are ignored.
    placeType: new Set(),
    scope: new Set(),
    landUse: new Set(),
    status: new Set(),
    country: new Set(),
    year: new Set(),
    populationSliderIndexes: [0, 0],
  };

  test("no places", () => {
    const resultMap = determineHtml(
      "map",
      DEFAULT_STATE,
      0,
      new Set(),
      new Set(),
      new Set(),
    );
    const resultTable = determineHtml(
      "table",
      DEFAULT_STATE,
      0,
      new Set(),
      new Set(),
      new Set(),
    );
    const expected = "No places selected — use the filter or search icons";
    expect(resultMap).toEqual(expected);
    expect(resultTable).toEqual(expected);
  });

  test("search", () => {
    const state = { ...DEFAULT_STATE, searchInput: "My Town" };
    const resultMap = determineHtml(
      "map",
      state,
      1,
      new Set(),
      new Set(),
      new Set(),
    );
    const resultTable = determineHtml(
      "table",
      state,
      1,
      new Set(),
      new Set(),
      new Set(),
    );
    const expected =
      'Showing My Town from search — <a class="counter-search-reset" role="button" aria-label="reset search">reset</a>';
    expect(resultMap).toEqual(expected);
    expect(resultTable).toEqual(expected);
  });

  test("any parking reform", () => {
    const assertMapAndTable = (
      state: FilterState,
      matchedPolicyTypes: PolicyType[],
      expected: string,
    ): void => {
      const resultMap = determineHtml(
        "map",
        state,
        5,
        new Set(matchedPolicyTypes),
        new Set(["Mexico"]),
        new Set(["city", "county"]),
      );
      const resultTable = determineHtml(
        "table",
        state,
        5,
        new Set(matchedPolicyTypes),
        new Set(["Mexico"]),
        new Set(["city", "county"]),
      );
      expect(resultMap).toEqual(expected);
      expect(resultTable).toEqual(expected);
    };

    const everyPolicyType: PolicyType[] = [
      "add parking maximums",
      "reduce parking minimums",
      "remove parking minimums",
    ];

    // We only show policy types that are both present in the matched places &
    // the user requested to see via `includedPolicyChanges`.
    assertMapAndTable(
      DEFAULT_STATE,
      everyPolicyType,
      "Showing 5 places in Mexico with parking minimums removed, parking minimums reduced, or parking maximums added",
    );
    assertMapAndTable(
      DEFAULT_STATE,
      ["add parking maximums", "remove parking minimums"],
      "Showing 5 places in Mexico with parking minimums removed or parking maximums added",
    );
    assertMapAndTable(
      DEFAULT_STATE,
      ["add parking maximums"],
      "Showing 5 places in Mexico with parking maximums added",
    );

    assertMapAndTable(
      {
        ...DEFAULT_STATE,
        includedPolicyChanges: new Set([
          "reduce parking minimums",
          "remove parking minimums",
        ]),
      },
      everyPolicyType,
      "Showing 5 places in Mexico with parking minimums removed or parking minimums reduced",
    );
    assertMapAndTable(
      {
        ...DEFAULT_STATE,
        includedPolicyChanges: new Set(["remove parking minimums"]),
      },
      everyPolicyType,
      "Showing 5 places in Mexico with parking minimums removed",
    );
    assertMapAndTable(
      {
        ...DEFAULT_STATE,
        includedPolicyChanges: new Set(["reduce parking minimums"]),
      },
      everyPolicyType,
      "Showing 5 places in Mexico with parking minimums reduced",
    );
    assertMapAndTable(
      {
        ...DEFAULT_STATE,
        includedPolicyChanges: new Set(["add parking maximums"]),
      },
      everyPolicyType,
      "Showing 5 places in Mexico with parking maximums added",
    );

    assertMapAndTable(
      {
        ...DEFAULT_STATE,
        allMinimumsRemovedToggle: true,
      },
      everyPolicyType,
      "Showing 5 places in Mexico with all parking minimums removed",
    );
    assertMapAndTable(
      {
        ...DEFAULT_STATE,
        allMinimumsRemovedToggle: true,
        includedPolicyChanges: new Set(["add parking maximums"]),
      },
      everyPolicyType,
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
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const resultTableEqualRecords = determineHtml(
      "table",
      state,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const resultTableUnequalRecords = determineHtml(
      "table",
      state,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const expectedNoRecords =
      "Showing 5 places in 2 countries with parking minimums reduced";
    const expectedRecords =
      "Showing 5 places in 2 countries with parking minimums reduced";
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
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const allMinimumsRemovedTableEqualRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const allMinimumsRemovedTableUnequalRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
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
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const resultTableEqualRecords = determineHtml(
      "table",
      state,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const resultTableUnequalRecords = determineHtml(
      "table",
      state,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const expectedNoRecords =
      "Showing 5 places in 2 countries with parking minimums removed";
    const expectedRecords =
      "Showing 5 places in 2 countries with parking minimums removed";
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
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const allMinimumsRemovedTableEqualRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const allMinimumsRemovedTableUnequalRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
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
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const resultTableEqualRecords = determineHtml(
      "table",
      state,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const resultTableUnequalRecords = determineHtml(
      "table",
      state,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const expectedNoRecords =
      "Showing 5 places in 2 countries with parking maximums added";
    const expectedRecords =
      "Showing 5 places in 2 countries with parking maximums added";
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
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const allMinimumsRemovedTableEqualRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const allMinimumsRemovedTableUnequalRecords = determineHtml(
      "table",
      allMinimumsRemovedState,
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const allMinimumsRemovedExpectedEqualRecords =
      "Showing 5 places in 2 countries with both all parking minimums removed and parking maximums added";
    const allMinimumsRemovedExpectedUnequalRecords =
      "Showing 5 places in 2 countries with both all parking minimums removed and parking maximums added";
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
      new Set(),
      new Set(["United States"]),
      new Set(["city", "county"]),
    );
    expect(result).toEqual(
      "Showing 1 place in the United States with parking minimums reduced",
    );
  });

  test("place type", () => {
    const city = determineHtml(
      "map",
      { ...DEFAULT_STATE, policyTypeFilter: "reduce parking minimums" },
      2,
      new Set(),
      new Set(["Mexico"]),
      new Set(["city"]),
    );
    expect(city).toEqual(
      "Showing 2 cities in Mexico with parking minimums reduced",
    );

    const county = determineHtml(
      "map",
      { ...DEFAULT_STATE, policyTypeFilter: "reduce parking minimums" },
      2,
      new Set(),
      new Set(["Mexico"]),
      new Set(["county"]),
    );
    expect(county).toEqual(
      "Showing 2 counties in Mexico with parking minimums reduced",
    );

    const state = determineHtml(
      "map",
      { ...DEFAULT_STATE, policyTypeFilter: "reduce parking minimums" },
      2,
      new Set(),
      new Set(["Mexico"]),
      new Set(["state"]),
    );
    expect(state).toEqual(
      "Showing 2 states in Mexico with parking minimums reduced",
    );

    const country = determineHtml(
      "map",
      { ...DEFAULT_STATE, policyTypeFilter: "reduce parking minimums" },
      1,
      new Set(),
      new Set(["Mexico"]),
      new Set(["country"]),
    );
    expect(country).toEqual("Showing 1 country with parking minimums reduced");
  });
});
