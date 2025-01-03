import { expect, test } from "@playwright/test";

import {
  determineHtml,
  determineLegacy,
  determineAnyReform,
  determineAddMax,
  determineReduceMin,
  determineRmMin,
  determinePlaceDescription,
} from "../../src/js/counters";
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
    const result = determineHtml(
      { ...DEFAULT_STATE, searchInput: "My Town" },
      1,
      new Set(),
      new Set(),
      new Set(),
    );
    expect(result).toEqual(
      'Showing My Town from search — <a class="counter-search-reset" role="button" aria-label="reset search">reset</a>',
    );
  });
});

test("determinePlaceDescription()", () => {
  const countries = new Set(["Mexico", "Egypt"]);
  const jurisdictions = new Set(["city", "state"] as const);

  expect(determinePlaceDescription(1, countries, jurisdictions)).toEqual(
    "1 place in 2 countries",
  );
  expect(determinePlaceDescription(2, countries, jurisdictions)).toEqual(
    "2 places in 2 countries",
  );

  expect(
    determinePlaceDescription(2, new Set(["Mexico"]), jurisdictions),
  ).toEqual("2 places in Mexico");
  expect(
    determinePlaceDescription(2, new Set(["United States"]), jurisdictions),
  ).toEqual("2 places in the United States");

  expect(determinePlaceDescription(1, countries, new Set(["city"]))).toEqual(
    "1 city in 2 countries",
  );
  expect(determinePlaceDescription(2, countries, new Set(["city"]))).toEqual(
    "2 cities in 2 countries",
  );

  expect(determinePlaceDescription(1, countries, new Set(["county"]))).toEqual(
    "1 county in 2 countries",
  );
  expect(determinePlaceDescription(2, countries, new Set(["county"]))).toEqual(
    "2 counties in 2 countries",
  );

  expect(determinePlaceDescription(1, countries, new Set(["state"]))).toEqual(
    "1 state in 2 countries",
  );
  expect(determinePlaceDescription(2, countries, new Set(["state"]))).toEqual(
    "2 states in 2 countries",
  );

  expect(determinePlaceDescription(1, countries, new Set(["country"]))).toEqual(
    "1 country",
  );
  expect(determinePlaceDescription(2, countries, new Set(["country"]))).toEqual(
    "2 countries",
  );
});

test("determineLegacy()", () => {
  expect(determineLegacy("2 places in Mexico", false)).toEqual(
    "Showing 2 places in Mexico with parking reforms",
  );
  expect(determineLegacy("2 places in Mexico", true)).toEqual(
    "Showing 2 places in Mexico with all parking minimums removed",
  );
});

test("determineAddMax()", () => {
  expect(determineAddMax("2 places in Mexico", false)).toEqual(
    "Showing 2 places in Mexico with parking maximums added",
  );
  expect(determineAddMax("2 places in Mexico", true)).toEqual(
    "Showing 2 places in Mexico with both all parking minimums removed and parking maximums added",
  );
});

test("determineReduceMinimums()", () => {
  expect(determineReduceMin("2 places in Mexico")).toEqual(
    "Showing 2 places in Mexico with parking minimums reduced",
  );
});

test("determineRemoveMin()", () => {
  expect(determineRmMin("2 places in Mexico", false)).toEqual(
    "Showing 2 places in Mexico with parking minimums removed",
  );
  expect(determineRmMin("2 places in Mexico", true)).toEqual(
    "Showing 2 places in Mexico with all parking minimums removed",
  );
});

test("determineAnyReform()", () => {
  const assert = (
    args: {
      matched: PolicyType[];
      allMinimums: boolean;
      statePolicy: PolicyType[];
    },
    expected: string,
  ): void => {
    const result = determineAnyReform(
      "5 places in Mexico",
      new Set(args.matched),
      args.allMinimums,
      new Set(args.statePolicy),
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
    {
      matched: everyPolicyType,
      statePolicy: everyPolicyType,
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking minimums removed, parking minimums reduced, or parking maximums added",
  );
  assert(
    {
      matched: ["add parking maximums", "remove parking minimums"],
      statePolicy: everyPolicyType,
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking minimums removed or parking maximums added",
  );
  assert(
    {
      matched: everyPolicyType,
      statePolicy: ["add parking maximums", "remove parking minimums"],
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking minimums removed or parking maximums added",
  );
  assert(
    {
      matched: ["add parking maximums"],
      statePolicy: everyPolicyType,
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking maximums added",
  );
  assert(
    {
      matched: everyPolicyType,
      statePolicy: ["add parking maximums"],
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking maximums added",
  );

  assert(
    {
      matched: everyPolicyType,
      statePolicy: everyPolicyType,
      allMinimums: true,
    },
    "Showing 5 places in Mexico with all parking minimums removed",
  );
  assert(
    {
      matched: everyPolicyType,
      statePolicy: ["add parking maximums"],
      allMinimums: true,
    },
    "Showing 5 places in Mexico with both all parking minimums removed and parking maximums added",
  );
});
