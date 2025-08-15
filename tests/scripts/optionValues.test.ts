import { expect, test } from "@playwright/test";

import {
  sortCountries,
  determineOptionValues,
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
        country: "United States",
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
        country: "Brazil",
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
      benefit_district: [{ status: "adopted", date: "1997" }],
    },
  ];
  const expected = {
    merged: {
      placeType: ["city", "country"],
      country: ["United States", "Brazil"],
      scope: [
        "city center / business district",
        "citywide",
        "regional",
        "transit-oriented",
      ],
      landUse: [
        "all uses",
        "commercial",
        "medical",
        "other",
        "residential, all uses",
      ],
      year: [UNKNOWN_YEAR, "2025", "2022", "1997"],
    },
    anyAdopted: {
      placeType: ["city", "country"],
      country: ["United States", "Brazil"],
      scope: ["city center / business district", "regional"],
      landUse: ["all uses", "commercial"],
      year: [UNKNOWN_YEAR, "1997"],
    },
    anyProposed: {
      placeType: ["country"],
      country: ["Brazil"],
      scope: ["regional", "transit-oriented"],
      landUse: ["medical"],
      year: ["2025"],
    },
    anyRepealed: {
      placeType: ["city"],
      country: ["United States"],
      scope: ["citywide"],
      landUse: ["other", "residential, all uses"],
      year: ["2022"],
    },
    addMaxAdopted: {
      placeType: [],
      country: [],
      scope: [],
      landUse: [],
      year: [],
    },
    addMaxProposed: {
      placeType: [],
      country: [],
      scope: [],
      landUse: [],
      year: [],
    },
    addMaxRepealed: {
      placeType: ["city"],
      country: ["United States"],
      scope: ["citywide"],
      landUse: ["other", "residential, all uses"],
      year: ["2022"],
    },
    reduceMinAdopted: {
      placeType: ["country"],
      country: ["Brazil"],
      scope: ["regional"],
      landUse: ["commercial"],
      year: [UNKNOWN_YEAR],
    },
    reduceMinProposed: {
      placeType: ["country"],
      country: ["Brazil"],
      scope: ["regional", "transit-oriented"],
      landUse: ["medical"],
      year: ["2025"],
    },
    reduceMinRepealed: {
      placeType: [],
      country: [],
      scope: [],
      landUse: [],
      year: [],
    },
    rmMinAdopted: {
      placeType: ["city"],
      country: ["United States"],
      scope: ["city center / business district"],
      landUse: ["all uses"],
      year: [UNKNOWN_YEAR],
    },
    rmMinProposed: {
      placeType: [],
      country: [],
      scope: [],
      landUse: [],
      year: [],
    },
    rmMinRepealed: {
      placeType: [],
      country: [],
      scope: [],
      landUse: [],
      year: [],
    },
    benefitDistrictAdopted: {
      placeType: ["country"],
      country: ["Brazil"],
      scope: [],
      landUse: [],
      year: ["1997"],
    },
    benefitDistrictProposed: {
      placeType: [],
      country: [],
      scope: [],
      landUse: [],
      year: [],
    },
    benefitDistrictRepealed: {
      placeType: [],
      country: [],
      scope: [],
      landUse: [],
      year: [],
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
