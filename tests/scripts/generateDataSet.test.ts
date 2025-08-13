import { expect, test } from "@playwright/test";

import {
  createAnyPolicyCsvs,
  createBenefitDistrictCsv,
  createLandUseCsv,
} from "../../scripts/generateDataSet";
import type { Citation, ProcessedCompleteEntry } from "../../scripts/lib/data";
import { Date } from "../../src/js/model/types";

// This test uses snapshot testing (https://jestjs.io/docs/snapshot-testing#updating-snapshots). If the tests fail and the changes
// are valid, run `npm test -- --updateSnapshot`.

function normalize(csv: string): string {
  return csv.replace(/\r\n/g, "\n");
}

// eslint-disable-next-line no-empty-pattern
test("generate CSVs", async ({}, testInfo) => {
  // Normally, Playwright saves the operating system name in the snapshot results.
  // Our test is OS-independent, so turn this off.
  // eslint-disable-next-line no-param-reassign
  testInfo.snapshotSuffix = "";

  const citation: Citation = {
    description: "citation",
    url: null,
    notes: null,
    attachments: [],
    screenshots: [],
  };

  const entries: ProcessedCompleteEntry[] = [
    {
      place: {
        name: "My City",
        state: "NY",
        country: "US",
        type: "city",
        repeal: true,
        pop: 24104,
        coord: [44.23, 14.23],
        url: "https://parkingreform.org/my-city-details.html",
      },
      add_max: [
        {
          summary: "Maximums summary #1",
          status: "adopted",
          scope: ["citywide"],
          land: ["commercial", "other"],
          requirements: ["by right"],
          date: new Date("2022-02-13"),
          reporter: "Donald Shoup",
          citations: [citation, citation],
        },
        {
          summary: "Maximums summary #2",
          status: "repealed",
          scope: ["regional"],
          land: ["other"],
          requirements: [],
          date: null,
          reporter: "Donald Shoup",
          citations: [citation],
        },
      ],
    },
    {
      place: {
        name: "Another Place",
        state: "CA",
        country: "US",
        type: "county",
        repeal: false,
        pop: 414,
        coord: [80.3, 24.23],
        url: "https://parkingreform.org/another-place.html",
      },
      rm_min: [
        {
          summary: "Remove minimums",
          status: "proposed",
          scope: [],
          land: [],
          requirements: [],
          date: null,
          reporter: "Donald Shoup",
          citations: [],
        },
      ],
    },
    {
      place: {
        name: "Place with PBD",
        state: "GDL",
        country: "MX",
        type: "city",
        repeal: false,
        pop: 5141414,
        coord: [90.3, 30.23],
        url: "https://parkingreform.org/place-with-pbd.html",
      },
      benefit_district: [
        {
          summary: "A really cool district",
          status: "proposed",
          date: null,
          reporter: "Donald Shoup",
          citations: [],
        },
      ],
    },
  ];
  const { adopted, proposed, repealed } = createAnyPolicyCsvs(entries);
  expect(normalize(adopted)).toMatchSnapshot("overview-adopted.csv");
  expect(normalize(proposed)).toMatchSnapshot("overview-proposed.csv");
  expect(normalize(repealed)).toMatchSnapshot("overview-repealed.csv");

  const maximums = createLandUseCsv(entries, (entry) => entry.add_max);
  expect(normalize(maximums)).toMatchSnapshot("maximums.csv");

  const benefitDistrict = createBenefitDistrictCsv(entries);
  expect(normalize(benefitDistrict)).toMatchSnapshot("benefit-district.csv");
});
