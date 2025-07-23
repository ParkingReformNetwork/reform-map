import { expect, test } from "@playwright/test";

import {
  sortCountries,
  determineOptionValues,
} from "../../scripts/lib/optionValues";
import {
  ALL_POLICY_TYPE,
  ALL_REFORM_STATUS,
  RawCoreEntry,
  UNKNOWN_YEAR,
} from "../../src/js/model/types";

test("determineOptionValues()", () => {
  const commonPlace = {
    name: "n/a",
    state: "n/a",
    pop: 0,
    coord: [0, 0] as [number, number],
    repeal: false,
  };
  const input: RawCoreEntry[] = [
    {
      place: {
        ...commonPlace,
        country: "US",
        type: "city",
      },
      rm_min: [
        {
          status: "adopted",
          scope: ["city center / business district"],
          land: ["all uses"],
          date: null,
        },
      ],
      add_max: [
        {
          status: "repealed",
          scope: ["citywide"],
          land: ["other", "residential, all uses"],
          date: "2022-02-13",
        },
      ],
    },
    {
      place: {
        ...commonPlace,
        country: "BR",
        type: "country",
      },
      reduce_min: [
        {
          status: "adopted",
          scope: ["regional"],
          land: ["commercial"],
          date: null,
        },
        {
          status: "proposed",
          scope: ["transit-oriented", "regional"],
          land: ["medical"],
          date: "2025",
        },
      ],
    },
  ];
  const expected = {
    policy: ALL_POLICY_TYPE,
    status: ALL_REFORM_STATUS,
    merged: {
      placeType: ["city", "country"],
      country: ["United States", "Brazil"],
      landUse: [
        "all uses",
        "commercial",
        "medical",
        "other",
        "residential, all uses",
      ],
      scope: [
        "city center / business district",
        "citywide",
        "regional",
        "transit-oriented",
      ],
      year: [UNKNOWN_YEAR, "2025", "2022"],
    },
    any: {
      placeType: ["city", "country"],
      country: ["United States", "Brazil"],
      landUse: [
        "all uses",
        "commercial",
        "medical",
        "other",
        "residential, all uses",
      ],
      scope: [
        "city center / business district",
        "citywide",
        "regional",
        "transit-oriented",
      ],
      year: [UNKNOWN_YEAR, "2025", "2022"],
    },
    addMax: {
      placeType: ["city"],
      country: ["United States"],
      landUse: ["other", "residential, all uses"],
      scope: ["citywide"],
      year: [UNKNOWN_YEAR, "2022"],
    },
    reduceMin: {
      placeType: ["country"],
      country: ["Brazil"],
      landUse: ["commercial", "medical"],
      scope: ["regional", "transit-oriented"],
      year: [UNKNOWN_YEAR, "2025"],
    },
    rmMin: {
      placeType: ["city"],
      country: ["United States"],
      landUse: ["all uses"],
      scope: ["city center / business district"],
      year: [UNKNOWN_YEAR],
    },
  };
  expect(determineOptionValues(input)).toEqual(expected);
});

test("sortCountries", () => {
  const withUS = new Set(["Canada", "Brazil", "United States", "Argentina"]);
  expect(sortCountries(withUS)).toEqual([
    "United States",
    "Argentina",
    "Brazil",
    "Canada",
  ]);

  const withoutUS = new Set(["Canada", "Brazil", "Argentina"]);
  expect(sortCountries(withoutUS)).toEqual(["Argentina", "Brazil", "Canada"]);
});
