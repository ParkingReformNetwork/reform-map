import { expect, test } from "@playwright/test";

import {
  encodeFilterState,
  decodeFilterState,
  DEFAULT_FILTER_STATE,
} from "../../src/js/state/urlEncoder";
import { FilterState } from "../../src/js/state/FilterState";

test.describe("encodeFilterState", () => {
  test("default state", () => {
    expect(encodeFilterState(DEFAULT_FILTER_STATE).size).toEqual(0);
  });

  test("set every value", () => {
    const state: FilterState = {
      ...DEFAULT_FILTER_STATE,
      policyTypeFilter: "reduce parking minimums",
      status: "repealed",
    };
    const result = encodeFilterState(state);
    expect(result.get("reform")).toEqual("rd");
    expect(result.get("status")).toEqual("r");

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
      const originalAsParams = new URLSearchParams(query.slice(1));
      originalAsParams.sort();
      expect(reEncoded).toEqual(originalAsParams.toString());
    }
  };

  test("default state", () => {
    assertDecode("", DEFAULT_FILTER_STATE, { checkRoundTrip: true });
  });

  test("set every value", () => {
    assertDecode(
      "?reform=bd&status=p",
      {
        ...DEFAULT_FILTER_STATE,
        policyTypeFilter: "parking benefit district",
        status: "proposed",
      },
      { checkRoundTrip: true },
    );
  });

  test("unrecognized values", () => {
    assertDecode("?reform=foo&status=foo", DEFAULT_FILTER_STATE, {
      checkRoundTrip: false,
    });
  });
});
