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
    const result = determineHtml(
      DEFAULT_STATE,
      0,
      new Set(),
      new Set(),
      new Set(),
    );
    expect(result).toEqual(
      "No places selected — use the filter or search icons",
    );
  });

  test("search", () => {
    const state = { ...DEFAULT_STATE, searchInput: "My Town" };
    const result = determineHtml(state, 1, new Set(), new Set(), new Set());
    expect(result).toEqual(
      'Showing My Town from search — <a class="counter-search-reset" role="button" aria-label="reset search">reset</a>',
    );
  });

  test("any parking reform", () => {
    const assert = (
      state: FilterState,
      matchedPolicyTypes: PolicyType[],
      expected: string,
    ): void => {
      const result = determineHtml(
        state,
        5,
        new Set(matchedPolicyTypes),
        new Set(["Mexico"]),
        new Set(["city", "county"]),
      );
      expect(result).toEqual(expected);
    };

    const everyPolicyType: PolicyType[] = [
      "add parking maximums",
      "reduce parking minimums",
      "remove parking minimums",
    ];

    // We only show policy types that are both present in the matched places &
    // the user requested to see via `includedPolicyChanges`.
    assert(
      DEFAULT_STATE,
      everyPolicyType,
      "Showing 5 places in Mexico with parking minimums removed, parking minimums reduced, or parking maximums added",
    );
    assert(
      DEFAULT_STATE,
      ["add parking maximums", "remove parking minimums"],
      "Showing 5 places in Mexico with parking minimums removed or parking maximums added",
    );
    assert(
      DEFAULT_STATE,
      ["add parking maximums"],
      "Showing 5 places in Mexico with parking maximums added",
    );

    assert(
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
    assert(
      {
        ...DEFAULT_STATE,
        includedPolicyChanges: new Set(["remove parking minimums"]),
      },
      everyPolicyType,
      "Showing 5 places in Mexico with parking minimums removed",
    );
    assert(
      {
        ...DEFAULT_STATE,
        includedPolicyChanges: new Set(["reduce parking minimums"]),
      },
      everyPolicyType,
      "Showing 5 places in Mexico with parking minimums reduced",
    );
    assert(
      {
        ...DEFAULT_STATE,
        includedPolicyChanges: new Set(["add parking maximums"]),
      },
      everyPolicyType,
      "Showing 5 places in Mexico with parking maximums added",
    );

    assert(
      {
        ...DEFAULT_STATE,
        allMinimumsRemovedToggle: true,
      },
      everyPolicyType,
      "Showing 5 places in Mexico with all parking minimums removed",
    );
    assert(
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
    const result = determineHtml(
      {
        ...DEFAULT_STATE,
        policyTypeFilter: "reduce parking minimums",
      },
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    const expected =
      "Showing 5 places in 2 countries with parking minimums reduced";
    expect(result).toEqual(expected);

    // allMinimumsRemovedToggle doesn't matter
    const allMinimumsRemoved = determineHtml(
      {
        ...DEFAULT_STATE,
        policyTypeFilter: "reduce parking minimums",
        allMinimumsRemovedToggle: true,
      },
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    expect(allMinimumsRemoved).toEqual(expected);
  });

  test("remove minimums", () => {
    const result = determineHtml(
      {
        ...DEFAULT_STATE,
        policyTypeFilter: "remove parking minimums",
      },
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    expect(result).toEqual(
      "Showing 5 places in 2 countries with parking minimums removed",
    );

    const allMinimumsRemoved = determineHtml(
      {
        ...DEFAULT_STATE,
        policyTypeFilter: "remove parking minimums",
        allMinimumsRemovedToggle: true,
      },
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    expect(allMinimumsRemoved).toEqual(
      "Showing 5 places in 2 countries with all parking minimums removed",
    );
  });

  test("add maximums", () => {
    const result = determineHtml(
      {
        ...DEFAULT_STATE,
        policyTypeFilter: "add parking maximums",
      },
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    expect(result).toEqual(
      "Showing 5 places in 2 countries with parking maximums added",
    );

    const allMinimumsRemoved = determineHtml(
      {
        ...DEFAULT_STATE,
        policyTypeFilter: "add parking maximums",
        allMinimumsRemovedToggle: true,
      },
      5,
      new Set(),
      new Set(["Mexico", "Brazil"]),
      new Set(["city", "county"]),
    );
    expect(allMinimumsRemoved).toEqual(
      "Showing 5 places in 2 countries with both all parking minimums removed and parking maximums added",
    );
  });

  test("grammar", () => {
    const result = determineHtml(
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
      { ...DEFAULT_STATE, policyTypeFilter: "reduce parking minimums" },
      1,
      new Set(),
      new Set(["Mexico"]),
      new Set(["country"]),
    );
    expect(country).toEqual("Showing 1 country with parking minimums reduced");
  });
});
