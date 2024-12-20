import { expect, test } from "@playwright/test";

import {
  loadTemplate,
  renderHandlebars,
} from "../../scripts/generateHtmlPages";
import { Date } from "../../src/js/types";

// This test uses snapshot testing (https://jestjs.io/docs/snapshot-testing#updating-snapshots). If the tests fail and the changes
// are valid, run `npm test -- --updateSnapshot`.

// eslint-disable-next-line no-empty-pattern
test("generate html page", async ({}, testInfo) => {
  // Normally, Playwright saves the operating system name in the snapshot results.
  // Our test is OS-independent, so turn this off.
  // eslint-disable-next-line no-param-reassign
  testInfo.snapshotSuffix = "";

  const template = await loadTemplate();
  const result = renderHandlebars(
    "My City, NY",
    {
      place: {
        name: "My City",
        state: "NY",
        country: "US",
        repeal: true,
        pop: 24104,
        coord: [44.23, 14.23],
        url: "https://parkingreform.org/my-city-details.html",
      },
      unifiedPolicy: {
        summary: "No parking mandates for the win!",
        status: "passed",
        policy: ["reduce parking minimums", "add parking maximums"],
        scope: ["citywide"],
        land: ["commercial", "other"],
        date: new Date("2018-03-27"),
        reporter: "Parking God",
        requirements: ["by right"],
        citations: [
          {
            description: "Zoning Code",
            type: "city code",
            url: "https://parkingreform.org/some-url.pdf",
            notes: "Here's a note",
            attachments: [
              {
                fileName: "MyCity_NY_1_1.png",
                directusId: "abc-af-ac",
                isDoc: false,
              },
            ],
          },
          {
            description: "News article",
            type: "media report",
            url: "https://parkingreform.org/some-other-url.pdf",
            notes: "",
            attachments: [
              {
                fileName: "MyCity_NY_2_1.png",
                directusId: "abc-af-ac",
                isDoc: false,
              },
              {
                fileName: "MyCity_NY_2_2.pdf",
                directusId: "abc-af-ac",
                isDoc: true,
              },
            ],
          },
        ],
      },
    },
    template,
  );
  expect(result).toMatchSnapshot("page.html");
});
