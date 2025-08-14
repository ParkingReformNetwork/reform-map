import { expect, test } from "@playwright/test";

import {
  determineHtml,
  determineAnyReform,
  determineAddMax,
  determineBenefitDistrict,
  determineReduceMin,
  determineRmMin,
  determinePlaceDescription,
  determineSearch,
  SEARCH_RESET_HTML,
} from "../../src/js/filter-features/counters";
import {
  ALL_POLICY_TYPE_FILTER,
  FilterState,
} from "../../src/js/state/FilterState";
import {
  ALL_POLICY_TYPE,
  ALL_REFORM_STATUS,
  PolicyType,
  ReformStatus,
} from "../../src/js/model/types";
import { ViewState } from "../../src/js/layout/viewToggle";

test.describe("determineHtml", () => {
  const DEFAULT_STATE: FilterState = {
    searchInput: null,
    policyTypeFilter: "any parking reform",
    allMinimumsRemovedToggle: false,
    includedPolicyChanges: new Set(ALL_POLICY_TYPE),
    // The below values are ignored.
    placeType: new Set(),
    scope: new Set(),
    landUse: new Set(),
    status: "adopted",
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
  for (const policyType of ALL_POLICY_TYPE_FILTER) {
    for (const status of ALL_REFORM_STATUS) {
      expect(
        determineSearch("map", "Baltimore, MD", policyType, status),
      ).toEqual(`Showing ${placeLink} — ${SEARCH_RESET_HTML}`);
    }
  }

  expect(
    determineSearch("table", "Baltimore, MD", "any parking reform", "adopted"),
  ).toEqual(
    `Showing an overview of adopted parking reforms in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
  expect(
    determineSearch(
      "table",
      "Baltimore, MD",
      "add parking maximums",
      "proposed",
    ),
  ).toEqual(
    `Showing details about proposed parking maximums in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
  expect(
    determineSearch(
      "table",
      "Baltimore, MD",
      "reduce parking minimums",
      "adopted",
    ),
  ).toEqual(
    `Showing details about adopted parking minimum reductions in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
  expect(
    determineSearch(
      "table",
      "Baltimore, MD",
      "remove parking minimums",
      "repealed",
    ),
  ).toEqual(
    `Showing details about repealed parking minimum removals in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
});

test("determineAddMax()", () => {
  expect(determineAddMax("map", "2 places in Mexico", "adopted")).toEqual(
    "Showing 2 places in Mexico with adopted parking maximums",
  );
  expect(determineAddMax("map", "2 places in Mexico", "repealed")).toEqual(
    "Showing 2 places in Mexico with repealed parking maximums",
  );

  expect(determineAddMax("table", "2 places in Mexico", "adopted")).toEqual(
    "Showing details about adopted parking maximums for 2 places in Mexico",
  );
  expect(determineAddMax("table", "2 places in Mexico", "repealed")).toEqual(
    "Showing details about repealed parking maximums for 2 places in Mexico",
  );
});

test("determineReduceMinimums()", () => {
  expect(determineReduceMin("map", "2 places in Mexico", "adopted")).toEqual(
    "Showing 2 places in Mexico with adopted parking minimum reductions",
  );
  expect(determineReduceMin("map", "2 places in Mexico", "repealed")).toEqual(
    "Showing 2 places in Mexico with repealed parking minimum reductions",
  );

  expect(determineReduceMin("table", "2 places in Mexico", "adopted")).toEqual(
    "Showing details about adopted parking minimum reductions for 2 places in Mexico",
  );
  expect(determineReduceMin("table", "2 places in Mexico", "repealed")).toEqual(
    "Showing details about repealed parking minimum reductions for 2 places in Mexico",
  );
});

test("determineRemoveMin()", () => {
  expect(determineRmMin("map", "2 places in Mexico", false, "adopted")).toEqual(
    "Showing 2 places in Mexico with adopted parking minimum removals",
  );
  expect(
    determineRmMin("map", "2 places in Mexico", false, "repealed"),
  ).toEqual(
    "Showing 2 places in Mexico with repealed parking minimum removals",
  );

  expect(determineRmMin("map", "2 places in Mexico", true, "adopted")).toEqual(
    "Showing 2 places in Mexico with all parking minimums removed",
  );
  expect(determineRmMin("map", "2 places in Mexico", true, "repealed")).toEqual(
    "Showing 2 places in Mexico with repealed parking minimum removals",
  );

  expect(
    determineRmMin("table", "2 places in Mexico", false, "adopted"),
  ).toEqual(
    "Showing details about adopted parking minimum removals for 2 places in Mexico",
  );
  expect(
    determineRmMin("table", "2 places in Mexico", false, "repealed"),
  ).toEqual(
    "Showing details about repealed parking minimum removals for 2 places in Mexico",
  );

  expect(
    determineRmMin("table", "2 places in Mexico", true, "adopted"),
  ).toEqual(
    "Showing details about adopted parking minimum removals for 2 places in Mexico that removed all parking minimums",
  );
  expect(
    determineRmMin("table", "2 places in Mexico", true, "repealed"),
  ).toEqual(
    "Showing details about repealed parking minimum removals for 2 places in Mexico",
  );
});

test("determineBenefitDistrict()", () => {
  expect(
    determineBenefitDistrict("map", "2 places in Mexico", "adopted"),
  ).toEqual(
    "Showing 2 places in Mexico with adopted parking benefit districts",
  );
  expect(
    determineBenefitDistrict("map", "2 places in Mexico", "repealed"),
  ).toEqual(
    "Showing 2 places in Mexico with repealed parking benefit districts",
  );

  expect(
    determineBenefitDistrict("table", "2 places in Mexico", "adopted"),
  ).toEqual(
    "Showing details about adopted parking benefit districts for 2 places in Mexico",
  );
  expect(
    determineBenefitDistrict("table", "2 places in Mexico", "repealed"),
  ).toEqual(
    "Showing details about repealed parking benefit districts for 2 places in Mexico",
  );
});

test("determineAnyReform()", () => {
  const assert = (
    args: {
      view: ViewState;
      matched: readonly PolicyType[];
      statePolicy: readonly PolicyType[];
      state: ReformStatus;
    },
    expected: string,
  ): void => {
    const result = determineAnyReform(
      args.view,
      "5 places in Mexico",
      new Set(args.matched),
      new Set(args.statePolicy),
      args.state,
    );
    expect(result).toEqual(expected);
  };

  assert(
    { view: "table", matched: [], statePolicy: [], state: "adopted" },
    "Showing an overview of adopted parking reforms in 5 places in Mexico",
  );
  assert(
    { view: "table", matched: [], statePolicy: [], state: "repealed" },
    "Showing an overview of repealed parking reforms in 5 places in Mexico",
  );

  // For map view, we only show policy types that are both present in the matched places &
  // the user requested to see via `includedPolicyChanges`.
  assert(
    {
      view: "map",
      matched: ALL_POLICY_TYPE,
      statePolicy: ALL_POLICY_TYPE,
      state: "adopted",
    },
    "Showing 5 places in Mexico with 1+ adopted parking reforms:<ul><li>benefit district</li><li>maximums</li><li>minimum reductions</li><li>minimum removals</li></ul>",
  );
  assert(
    {
      view: "map",
      matched: ALL_POLICY_TYPE,
      statePolicy: ALL_POLICY_TYPE,
      state: "repealed",
    },
    "Showing 5 places in Mexico with 1+ repealed parking reforms:<ul><li>benefit district</li><li>maximums</li><li>minimum reductions</li><li>minimum removals</li></ul>",
  );

  assert(
    {
      view: "map",
      matched: ["add parking maximums", "remove parking minimums"],
      statePolicy: ALL_POLICY_TYPE,
      state: "adopted",
    },
    "Showing 5 places in Mexico with 1+ adopted parking reforms:<ul><li>maximums</li><li>minimum removals</li></ul>",
  );
  assert(
    {
      view: "map",
      matched: ALL_POLICY_TYPE,
      statePolicy: ["add parking maximums", "remove parking minimums"],
      state: "adopted",
    },
    "Showing 5 places in Mexico with 1+ adopted parking reforms:<ul><li>maximums</li><li>minimum removals</li></ul>",
  );

  assert(
    {
      view: "map",
      matched: ["add parking maximums"],
      statePolicy: ALL_POLICY_TYPE,
      state: "adopted",
    },
    "Showing 5 places in Mexico with adopted parking maximums",
  );
  assert(
    {
      view: "map",
      matched: ALL_POLICY_TYPE,
      statePolicy: ["add parking maximums"],
      state: "adopted",
    },
    "Showing 5 places in Mexico with adopted parking maximums",
  );
  assert(
    {
      view: "map",
      matched: ALL_POLICY_TYPE,
      statePolicy: ["reduce parking minimums"],
      state: "repealed",
    },
    "Showing 5 places in Mexico with repealed parking minimum reductions",
  );
  assert(
    {
      view: "map",
      matched: ALL_POLICY_TYPE,
      statePolicy: ["remove parking minimums"],
      state: "proposed",
    },
    "Showing 5 places in Mexico with proposed parking minimum removals",
  );
});
