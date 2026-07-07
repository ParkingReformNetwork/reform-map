import { expect, test } from "@playwright/test";

import {
  createAnyPolicyCsvs,
  createBenefitDistrictCsv,
  createLandUseCsv,
} from "../../scripts/generateDataSet";
import type { Citation, ProcessedCompleteEntry } from "../../scripts/lib/data";
import { ReformDate } from "../../src/js/model/ReformDate";
import {
  makeCompleteEntry,
  makePlace,
  normalizeLineEndings,
  useOsIndependentSnapshots,
} from "./utils";

// This test uses snapshot testing (https://jestjs.io/docs/snapshot-testing#updating-snapshots). If the tests fail and the changes
// are valid, run `npm test -- --updateSnapshot`.

// biome-ignore lint/correctness/noEmptyPattern: Playwright requires the fixtures arg to be an object destructuring pattern.
test("generate CSVs", async ({}, testInfo) => {
  useOsIndependentSnapshots(testInfo);

  const citation: Citation = {
    id: 0,
    description: "citation",
    url: null,
    notes: null,
    attachments: [],
    screenshots: [],
  };

  const entries: ProcessedCompleteEntry[] = [
    makeCompleteEntry({
      place: makePlace({
        name: "My City",
        state: "NY",
        repeal: true,
        pop: 24104,
        coord: [44.23, 14.23],
        url: "https://parkingreform.org/my-city-details.html",
      }),
      add_max: [
        {
          summary: "Maximums summary #1",
          status: "adopted",
          scope: ["citywide"],
          land: ["commercial", "other"],
          requirements: ["by right"],
          date: new ReformDate("2022-02-13"),
          reporter: "Donald Shoup",
          citations: [citation, citation],
        },
        {
          summary: "Maximums summary #2",
          status: "repealed",
          scope: ["regional"],
          land: ["other"],
          requirements: [],
          date: undefined,
          reporter: "Donald Shoup",
          citations: [citation],
        },
      ],
    }),
    makeCompleteEntry({
      place: makePlace({
        name: "Another Place",
        state: "CA",
        pop: 414,
        coord: [80.3, 24.23],
        url: "https://parkingreform.org/another-place.html",
        type: "county",
      }),
      rm_min: [
        {
          summary: "Remove minimums",
          status: "proposed",
          scope: [],
          land: [],
          requirements: [],
          date: undefined,
          reporter: "Donald Shoup",
          citations: [],
        },
      ],
    }),
    makeCompleteEntry({
      place: makePlace({
        name: "Place with PBD",
        state: "GDL",
        country: "Mexico",
        pop: 5141414,
        coord: [90.3, 30.23],
        url: "https://parkingreform.org/place-with-pbd.html",
      }),
      benefit_district: [
        {
          summary: "A really cool district",
          status: "proposed",
          date: undefined,
          reporter: "Donald Shoup",
          citations: [],
        },
      ],
    }),
  ];
  const { adopted, proposed, repealed } = createAnyPolicyCsvs(entries);
  expect(normalizeLineEndings(adopted)).toMatchSnapshot("overview-adopted.csv");
  expect(normalizeLineEndings(proposed)).toMatchSnapshot(
    "overview-proposed.csv",
  );
  expect(normalizeLineEndings(repealed)).toMatchSnapshot(
    "overview-repealed.csv",
  );

  const maximums = createLandUseCsv(entries, (entry) => entry.add_max);
  expect(normalizeLineEndings(maximums)).toMatchSnapshot("maximums.csv");

  const benefitDistrict = createBenefitDistrictCsv(entries);
  expect(normalizeLineEndings(benefitDistrict)).toMatchSnapshot(
    "benefit-district.csv",
  );
});
