import { expect, test } from "@playwright/test";

import {
  encodeFilterState,
  decodeFilterState,
  decodePopulation,
  DEFAULT_FILTER_STATE,
  STATUS_MAP,
  POLICY_TYPE_MAP,
  MERGED_STRING_SET_OPTIONS,
  PLACE_TYPE_MAP,
  LAND_USE_MAP,
  SCOPE_MAP,
  POLICY_TYPE_NAME,
  STATUS_NAME,
  ALL_MINIMUMS_REPEALED_TOGGLE_NAME,
  YEAR_NAME,
  INCLUDED_POLICY_NAME,
  PLACE_TYPE_NAME,
  LAND_USE_NAME,
  SCOPE_NAME,
  COUNTRY_MAP,
  COUNTRY_NAME,
  YEAR_MAP,
} from "../../src/js/state/urlEncoder";
import {
  ALL_POLICY_TYPE_FILTER,
  FilterState,
} from "../../src/js/state/FilterState";
import { ALL_REFORM_STATUS, UNKNOWN_YEAR } from "../../src/js/model/types";

test.describe("encodeFilterState", () => {
  test("default state", () => {
    expect(encodeFilterState(DEFAULT_FILTER_STATE).size).toEqual(0);
  });

  test("set every value", () => {
    const state: FilterState = {
      ...DEFAULT_FILTER_STATE,
      policyTypeFilter: "reduce parking minimums",
      status: "repealed",
      allMinimumsRemovedToggle: false,
      year: new Set(["1997", UNKNOWN_YEAR]),
      includedPolicyChanges: new Set([
        "reduce parking minimums",
        "parking benefit district",
      ]),
      placeType: new Set(["city", "state"]),
      landUse: new Set(["industrial", "medical"]),
      scope: new Set(["regional", "transit-oriented"]),
      country: new Set(["Mexico", "Brazil"]),
      populationSliderIndexes: [2, 4],
    };
    const result = encodeFilterState(state);
    expect(result.get("reform")).toEqual("rd");
    expect(result.get("status")).toEqual("r");
    expect(result.get("repeal")).toEqual("n");
    expect(result.get("yr")).toEqual("1997.unknown");
    expect(result.get("reforms")).toEqual("rd.bd");
    expect(result.get("pop")).toEqual("2.4");
    expect(result.get("juris")).toEqual("cty.st");
    expect(result.get("lnd")).toEqual("ind.med");
    expect(result.get("scp")).toEqual("reg.trns");
    expect(result.get("cntry")).toEqual("mx.br");

    // Check round-trip
    expect(decodeFilterState(result.toString())).toEqual(state);
  });
});

test.describe("decodeFilterState", () => {
  const assertDecode = (
    query: string,
    expected: FilterState,
    kwargs: { checkRoundTrip: boolean },
  ) => {
    const { checkRoundTrip } = kwargs;

    const decoded = decodeFilterState(query);
    expect(decoded).toEqual(expected);

    // Ensure round trip works.
    if (checkRoundTrip) {
      const reEncoded = encodeFilterState(decoded).toString();
      const originalAsParams = new URLSearchParams(query);
      originalAsParams.sort();
      expect(reEncoded).toEqual(originalAsParams.toString());
    }
  };

  test("default state", () => {
    assertDecode("", DEFAULT_FILTER_STATE, { checkRoundTrip: true });
  });

  test("set every value", () => {
    const url = [
      "reform=bd",
      "status=p",
      "repeal=n",
      "yr=2024.2025",
      "reforms=rd.bd",
      "pop=1.4",
      "juris=cty.st",
      "lnd=ind.med",
      "scp=reg.trns",
      "cntry=mx.br",
    ].join("&");
    assertDecode(
      url,
      {
        ...DEFAULT_FILTER_STATE,
        policyTypeFilter: "parking benefit district",
        status: "proposed",
        allMinimumsRemovedToggle: false,
        year: new Set(["2024", "2025"]),
        includedPolicyChanges: new Set([
          "reduce parking minimums",
          "parking benefit district",
        ]),
        placeType: new Set(["city", "state"]),
        landUse: new Set(["industrial", "medical"]),
        scope: new Set(["regional", "transit-oriented"]),
        country: new Set(["Mexico", "Brazil"]),
        populationSliderIndexes: [1, 4],
      },
      { checkRoundTrip: true },
    );
  });

  test("illegal values", () => {
    const url = [
      POLICY_TYPE_NAME,
      STATUS_NAME,
      ALL_MINIMUMS_REPEALED_TOGGLE_NAME,
      YEAR_NAME,
      INCLUDED_POLICY_NAME,
      PLACE_TYPE_NAME,
      LAND_USE_NAME,
      SCOPE_NAME,
      COUNTRY_NAME,
    ]
      .map((x) => `${x}=foo`)
      .join("&");
    assertDecode(url, DEFAULT_FILTER_STATE, {
      checkRoundTrip: false,
    });
  });

  test("some illegal array elements", () => {
    const url = [
      "yr=1.2024",
      "reforms=foo.rm",
      "juris=foo.cty",
      "lnd=foo.com",
      "scp=foo.reg",
      "cntry=foo.mx",
    ].join("&");
    assertDecode(
      url,
      {
        ...DEFAULT_FILTER_STATE,
        year: new Set(["2024"]),
        includedPolicyChanges: new Set(["remove parking minimums"]),
        landUse: new Set(["commercial"]),
        scope: new Set(["regional"]),
        placeType: new Set(["city"]),
        country: new Set(["Mexico"]),
      },
      {
        checkRoundTrip: false,
      },
    );
  });
});

test("decodePopulation", () => {
  const defaultVal = DEFAULT_FILTER_STATE.populationSliderIndexes;
  expect(decodePopulation(null)).toEqual(defaultVal);

  expect(decodePopulation("1.2")).toEqual([1, 2]);
  expect(decodePopulation("3.5")).toEqual([3, 5]);

  // Invalid vals
  expect(decodePopulation("foo")).toEqual(defaultVal);
  expect(decodePopulation("1.2.3")).toEqual(defaultVal);
  expect(decodePopulation("2.1")).toEqual(defaultVal);
  expect(decodePopulation("-1.2")).toEqual(defaultVal);
  expect(decodePopulation("1.11")).toEqual(defaultVal);
});

test.describe("mappers are fully comprehensive", () => {
  test("policy type", () => {
    expect(POLICY_TYPE_MAP.keys()).toEqual(new Set(ALL_POLICY_TYPE_FILTER));
  });

  test("status", () => {
    expect(STATUS_MAP.keys()).toEqual(new Set(ALL_REFORM_STATUS));
  });

  test("place type", () => {
    expect(PLACE_TYPE_MAP.keys()).toEqual(MERGED_STRING_SET_OPTIONS.placeType);
  });

  test("land use", () => {
    expect(LAND_USE_MAP.keys()).toEqual(MERGED_STRING_SET_OPTIONS.landUse);
  });

  test("scope", () => {
    expect(SCOPE_MAP.keys()).toEqual(MERGED_STRING_SET_OPTIONS.scope);
  });

  test("year", () => {
    expect(YEAR_MAP.keys()).toEqual(MERGED_STRING_SET_OPTIONS.year);
  });

  test("country", () => {
    expect(COUNTRY_MAP.keys()).toEqual(MERGED_STRING_SET_OPTIONS.country);
  });
});
