import { expect, test } from "@playwright/test";

import {
  encode,
  decode,
  DEFAULT_FILTER_STATE,
} from "../../src/js/state/urlEncoder";
import { FilterState } from "../../src/js/state/FilterState";

test.describe("encode", () => {
  test("default state", () => {
    expect(encode(DEFAULT_FILTER_STATE).size).toEqual(0);
  });

  test("set every value", () => {
    const state: FilterState = {
      ...DEFAULT_FILTER_STATE,
      policyTypeFilter: "reduce parking minimums",
      status: "repealed",
    };
    const result = encode(state);
    expect(result.get("reform")).toEqual("rd");
    expect(result.get("status")).toEqual("r");

    // Check round-trip
    expect(decode(result.toString())).toEqual(state);
  });
});

test.describe("decode", () => {
  const assertDecode = (
    query: string,
    expected: FilterState,
    kwargs: { checkRoundTrip: boolean },
  ) => {
    const { checkRoundTrip } = kwargs;

    const decoded = decode(query);
    expect(decoded).toEqual(expected);

    // Ensure round trip works.
    if (checkRoundTrip) {
      const reEncoded = encode(decoded).toString();
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
