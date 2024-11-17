import fs from "fs/promises";

import { expect, test } from "@playwright/test";

import {
  citationsUpdated,
  normalizeAttachments,
  parseDatetime,
  Citation,
} from "../../scripts/syncExtendedData";

test.describe("citationsUpdated()", () => {
  test("returns false if every citation is older than globalLastUpdated", () => {
    const citations = [
      {
        lastUpdated: parseDatetime("May 5, 2023, 8:00:00 AM PDT"),
      },
      {
        lastUpdated: parseDatetime("May 6, 2023, 8:00:00 AM PDT"),
      },
    ] as Citation[];
    const globalLastUpdated = parseDatetime("May 8, 2023, 8:00:00 AM PDT");
    expect(citationsUpdated(citations, globalLastUpdated)).toBe(false);
  });

  test("returns true if at least one of the citations has been updated recently", () => {
    const citations = [
      {
        lastUpdated: parseDatetime("May 5, 2023, 8:00:00 AM PDT"),
      },
      {
        lastUpdated: parseDatetime("May 10, 2023, 8:00:00 AM PDT"),
      },
    ] as Citation[];
    const globalLastUpdated = parseDatetime("May 6, 2023, 8:00:00 AM PDT");
    expect(citationsUpdated(citations, globalLastUpdated)).toBe(true);
  });

  test("can handle different time zones", () => {
    const citations = [
      {
        lastUpdated: parseDatetime("May 6, 2023, 12:00:00 PM PDT"),
      },
    ] as Citation[];
    // Even though 11 AM is naively earlier than 12 PM, due to time zones, the globalLastUpdated
    // happens after any of the city updates.
    let globalLastUpdated = parseDatetime(
      "May 6, 2023, 11:00:00 AM Pacific/Honolulu",
      false,
    );
    expect(citationsUpdated(citations, globalLastUpdated)).toBe(false);

    // To be extra sure, we ensure that the same time zone would return true.
    globalLastUpdated = parseDatetime("May 6, 2023, 11:00:00 AM PDT");
    expect(citationsUpdated(citations, globalLastUpdated)).toBe(true);
  });
});

test("normalizeAttachments() converts string entries into objects", () => {
  expect(normalizeAttachments("", 1, "My City, AZ")).toEqual([]);

  expect(
    normalizeAttachments("https://prn.org/photo1.png", 1, "My City, AZ"),
  ).toEqual([
    {
      url: "https://prn.org/photo1.png",
      fileName: "MyCity_AZ_1_1.png",
      isDoc: false,
    },
  ]);

  expect(
    normalizeAttachments(
      "https://prn.org/doc1.pdf https://prn.org/img2.jpg",
      2,
      "My City, AZ",
    ),
  ).toEqual([
    {
      url: "https://prn.org/doc1.pdf",
      fileName: "MyCity_AZ_2_1.pdf",
      isDoc: true,
    },
    {
      url: "https://prn.org/img2.jpg",
      fileName: "MyCity_AZ_2_2.jpg",
      isDoc: false,
    },
  ]);
});

test("city_detail_last_updated.txt is formatted correctly", async () => {
  const lastUpdated = await fs.readFile(
    "scripts/city_detail_last_updated.txt",
    "utf-8",
  );
  parseDatetime(lastUpdated, false); // will throw an error if incorrectly formatted
});
