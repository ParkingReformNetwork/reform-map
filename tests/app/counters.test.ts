import { expect, test } from "@playwright/test";

import {
  determineHtml,
  determineAnyReform,
  determineAddMax,
  determineReduceMin,
  determineRmMin,
  determinePlaceDescription,
  determineSearch,
  SEARCH_RESET_HTML,
} from "../../src/js/filter-features/counters";
import { FilterState } from "../../src/js/state/FilterState";
import { PolicyType } from "../../src/js/model/types";
import { ViewState } from "../../src/js/layout/viewToggle";

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
      "map",
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

test("determineSearch()", () => {
  const placeLink =
    '<a class="external-link" target="_blank" href=https://parkingreform.org/mandates-map/city_detail/Baltimore_MD.html>Baltimore, MD <i aria-hidden="true" class="fa-solid fa-arrow-right"></i></a>';

  // Map view always has the same text.
  for (const policyType of [
    "any parking reform",
    "add parking maximums",
    "remove parking minimums",
    "reduce parking minimums",
  ] as const) {
    expect(determineSearch("map", "Baltimore, MD", policyType)).toEqual(
      `Showing ${placeLink} — ${SEARCH_RESET_HTML}`,
    );
  }

  expect(
    determineSearch("table", "Baltimore, MD", "any parking reform"),
  ).toEqual(
    `Showing an overview of adopted parking reforms in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
  expect(
    determineSearch("table", "Baltimore, MD", "add parking maximums"),
  ).toEqual(
    `Showing details about parking maximums in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
  expect(
    determineSearch("table", "Baltimore, MD", "reduce parking minimums"),
  ).toEqual(
    `Showing details about parking minimum reductions in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
  expect(
    determineSearch("table", "Baltimore, MD", "remove parking minimums"),
  ).toEqual(
    `Showing details about parking minimum removals in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
});

test("determineAddMax()", () => {
  expect(determineAddMax("map", "2 places in Mexico", false)).toEqual(
    "Showing 2 places in Mexico with parking maximums added",
  );
  expect(determineAddMax("map", "2 places in Mexico", true)).toEqual(
    "Showing 2 places in Mexico with both all parking minimums removed and parking maximums added",
  );

  expect(determineAddMax("table", "2 places in Mexico", false)).toEqual(
    "Showing details about parking maximums for 2 places in Mexico",
  );
  expect(determineAddMax("table", "2 places in Mexico", true)).toEqual(
    "Showing details about parking maximums for 2 places in Mexico that have also removed all parking minimums",
  );
});

test("determineReduceMinimums()", () => {
  expect(determineReduceMin("map", "2 places in Mexico")).toEqual(
    "Showing 2 places in Mexico with parking minimums reduced",
  );
  expect(determineReduceMin("table", "2 places in Mexico")).toEqual(
    "Showing details about parking minimum reductions for 2 places in Mexico",
  );
});

test("determineRemoveMin()", () => {
  expect(determineRmMin("map", "2 places in Mexico", false)).toEqual(
    "Showing 2 places in Mexico with parking minimums removed",
  );
  expect(determineRmMin("map", "2 places in Mexico", true)).toEqual(
    "Showing 2 places in Mexico with all parking minimums removed",
  );

  expect(determineRmMin("table", "2 places in Mexico", false)).toEqual(
    "Showing details about parking minimum removals for 2 places in Mexico",
  );
  expect(determineRmMin("table", "2 places in Mexico", true)).toEqual(
    "Showing details about parking minimum removals for 2 places in Mexico that removed all parking minimums",
  );
});

test("determineAnyReform()", () => {
  const assert = (
    args: {
      view: ViewState;
      matched: PolicyType[];
      allMinimums: boolean;
      statePolicy: PolicyType[];
    },
    expected: string,
  ): void => {
    const result = determineAnyReform(
      args.view,
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

  // For table view, the text only depends on allMinimumsRemovedToggle.
  assert(
    { view: "table", matched: [], statePolicy: [], allMinimums: false },
    "Showing an overview of adopted parking reforms in 5 places in Mexico",
  );
  assert(
    { view: "table", matched: [], statePolicy: [], allMinimums: true },
    "Showing an overview of adopted parking reforms in 5 places in Mexico with all parking minimums removed",
  );

  // For map view, we only show policy types that are both present in the matched places &
  // the user requested to see via `includedPolicyChanges`.
  assert(
    {
      view: "map",
      matched: everyPolicyType,
      statePolicy: everyPolicyType,
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking minimums removed, parking minimums reduced, or parking maximums added",
  );
  assert(
    {
      view: "map",
      matched: ["add parking maximums", "remove parking minimums"],
      statePolicy: everyPolicyType,
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking minimums removed or parking maximums added",
  );
  assert(
    {
      view: "map",
      matched: everyPolicyType,
      statePolicy: ["add parking maximums", "remove parking minimums"],
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking minimums removed or parking maximums added",
  );
  assert(
    {
      view: "map",
      matched: ["add parking maximums"],
      statePolicy: everyPolicyType,
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking maximums added",
  );
  assert(
    {
      view: "map",
      matched: everyPolicyType,
      statePolicy: ["add parking maximums"],
      allMinimums: false,
    },
    "Showing 5 places in Mexico with parking maximums added",
  );

  assert(
    {
      view: "map",
      matched: everyPolicyType,
      statePolicy: everyPolicyType,
      allMinimums: true,
    },
    "Showing 5 places in Mexico with all parking minimums removed",
  );
  assert(
    {
      view: "map",
      matched: everyPolicyType,
      statePolicy: ["add parking maximums"],
      allMinimums: true,
    },
    "Showing 5 places in Mexico with both all parking minimums removed and parking maximums added",
  );
});
