import { expect, test } from "@playwright/test";

import {
  determineOptionValues,
  ALL_POLICY_TYPE,
  ALL_STATUS,
} from "../../scripts/lib/optionValues";
import { RawCoreEntry, UNKNOWN_YEAR } from "../../src/js/model/types";

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
    status: ALL_STATUS,
    placeType: ["city", "country"],
    country: ["Brazil", "United States"],
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
  };
  expect(determineOptionValues(input)).toEqual(expected);
});
