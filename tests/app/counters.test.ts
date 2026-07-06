import { expect, test } from "@playwright/test";

import {
  buildSimplePolicyText,
  determineAnyReform,
  determineHtml,
  determinePlaceDescription,
  determineRmMin,
  determineSearch,
  SEARCH_RESET_HTML,
  TABLE_DOWNLOAD_HTML,
} from "../../src/js/filter-features/counters";
import type { ViewState } from "../../src/js/layout/viewToggle";
import {
  ALL_POLICY_TYPE,
  ALL_REFORM_STATUS,
  type PolicyType,
  type ReformStatus,
} from "../../src/js/model/types";
import { ALL_POLICY_TYPE_FILTER } from "../../src/js/state/FilterState";
import { DEFAULT_FILTER_STATE } from "../../src/js/state/urlEncoder";

test.describe("determineHtml", () => {
  test("no places", () => {
    const result = determineHtml(
      "map",
      DEFAULT_FILTER_STATE,
      {},
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
  const placeId = "Baltimore, Maryland, United States";
  const encodedPlace = "baltimore-maryland-united-states";
  const placeLink = `<a class="external-link" target="_blank" href=https://parkingreform.org/mandates-map/city_detail/${encodedPlace}.html>${placeId} <svg aria-hidden="true" width="1em" height="1em"><use href="#icon-arrow-right"></use></svg></a>`;

  // Map view always has the same text.
  for (const policyType of ALL_POLICY_TYPE_FILTER) {
    for (const status of ALL_REFORM_STATUS) {
      expect(
        determineSearch("map", placeId, encodedPlace, policyType, status),
      ).toEqual(`Showing ${placeLink} — ${SEARCH_RESET_HTML}`);
    }
  }

  expect(
    determineSearch(
      "table",
      placeId,
      encodedPlace,
      "any parking reform",
      "adopted",
    ),
  ).toEqual(
    `Showing an overview of adopted parking reforms in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
  expect(
    determineSearch(
      "table",
      placeId,
      encodedPlace,
      "add parking maximums",
      "proposed",
    ),
  ).toEqual(
    `Showing details about proposed parking maximums in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
  expect(
    determineSearch(
      "table",
      placeId,
      encodedPlace,
      "reduce parking minimums",
      "adopted",
    ),
  ).toEqual(
    `Showing details about adopted parking minimum reductions in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
  expect(
    determineSearch(
      "table",
      placeId,
      encodedPlace,
      "remove parking minimums",
      "repealed",
    ),
  ).toEqual(
    `Showing details about repealed parking minimum removals in ${placeLink} — ${SEARCH_RESET_HTML}`,
  );
});

test("buildSimplePolicyText()", () => {
  expect(
    buildSimplePolicyText(
      "map",
      "2 places in Mexico",
      "adopted",
      "parking maximums",
    ),
  ).toEqual("Showing 2 places in Mexico with adopted parking maximums");
  expect(
    buildSimplePolicyText(
      "table",
      "2 places in Mexico",
      "adopted",
      "parking maximums",
    ),
  ).toEqual(
    `Showing details about adopted parking maximums for 2 places in Mexico - ${TABLE_DOWNLOAD_HTML}`,
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
    `Showing details about adopted parking minimum removals for 2 places in Mexico - ${TABLE_DOWNLOAD_HTML}`,
  );
  expect(
    determineRmMin("table", "2 places in Mexico", false, "repealed"),
  ).toEqual(
    `Showing details about repealed parking minimum removals for 2 places in Mexico - ${TABLE_DOWNLOAD_HTML}`,
  );

  expect(
    determineRmMin("table", "2 places in Mexico", true, "adopted"),
  ).toEqual(
    `Showing details about adopted parking minimum removals for 2 places in Mexico that removed all parking minimums - ${TABLE_DOWNLOAD_HTML}`,
  );
  expect(
    determineRmMin("table", "2 places in Mexico", true, "repealed"),
  ).toEqual(
    `Showing details about repealed parking minimum removals for 2 places in Mexico - ${TABLE_DOWNLOAD_HTML}`,
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
    `Showing an overview of adopted parking reforms in 5 places in Mexico - ${TABLE_DOWNLOAD_HTML}`,
  );
  assert(
    { view: "table", matched: [], statePolicy: [], state: "repealed" },
    `Showing an overview of repealed parking reforms in 5 places in Mexico - ${TABLE_DOWNLOAD_HTML}`,
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
