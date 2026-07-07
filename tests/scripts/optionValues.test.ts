import { expect, test } from "@playwright/test";

import {
  determineOptionValues,
  sortCountries,
} from "../../scripts/lib/optionValues";
import {
  makeRawCoreEntry,
  makeRawPlace,
  useOsIndependentSnapshots,
} from "./utils";

// This test uses snapshot testing (https://jestjs.io/docs/snapshot-testing#updating-snapshots). If the tests fail and the changes
// are valid, run `npm test -- --updateSnapshot`.
// biome-ignore lint/correctness/noEmptyPattern: Playwright requires the fixtures arg to be an object destructuring pattern.
test("determineOptionValues()", ({}, testInfo) => {
  useOsIndependentSnapshots(testInfo);

  const input = [
    makeRawCoreEntry({
      place: makeRawPlace({
        name: "n/a",
        state: "n/a",
        country: "United States",
        type: "city",
      }),
      rm_min: [
        {
          status: "adopted",
          scope: ["city center / business district"],
          land: ["all uses"],
          date: undefined,
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
    }),
    makeRawCoreEntry({
      place: makeRawPlace({
        name: "n/a",
        state: "n/a",
        country: "Brazil",
        type: "country",
      }),
      reduce_min: [
        {
          status: "adopted",
          scope: ["regional"],
          land: ["commercial"],
          date: undefined,
        },
        {
          status: "proposed",
          scope: ["transit-oriented", "regional"],
          land: ["medical"],
          date: "2025",
        },
      ],
      benefit_district: [{ status: "adopted", date: "1997" }],
    }),
  ];
  expect(JSON.stringify(determineOptionValues(input), null, 2)).toMatchSnapshot(
    "determineOptionValues.json",
  );
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
