import { expect, test } from "@playwright/test";

import {
  loadTemplate,
  renderHandlebars,
} from "../../scripts/generateHtmlPages";

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
      place: "My City",
      state: "NY",
      country: "US",
      summary: "No parking mandates for the win!",
      status: "passed",
      policy: ["reduce parking minimums", "add parking maximums"],
      scope: ["citywide"],
      land: ["commercial", "other"],
      repeal: true,
      pop: 24104,
      coord: [44.23, 14.23],
      date: "Mar 27, 2018",
      reporter: "Parking God",
      requirements: ["by right"],
      citations: [
        {
          description: "Zoning Code",
          type: "City Code",
          url: "https://parkingreform.org/some-url.pdf",
          notes: "Here's a note",
          attachments: [
            {
              fileName: "Zoning%20Img.png",
              isDoc: false,
              outputPath: "attachment_images/MyCity_NY_1_1.png",
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
              fileName: "Headline.png",
              isDoc: false,
              outputPath: "attachment_images/MyCity_NY_2_1.png",
            },
            {
              fileName: "article.pdf",
              isDoc: false,
              outputPath: "attachment_images/MyCity_NY_2_2.pdf",
            },
          ],
        },
      ],
    },
    template,
  );
  expect(result).toMatchSnapshot("page.html");
});
