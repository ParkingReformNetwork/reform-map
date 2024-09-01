import fs from "fs/promises";

import { expect, test } from "@playwright/test";

import {
  needsUpdate,
  normalizeAttachments,
  parseDatetime,
  PlaceEntry,
} from "../../scripts/updateCityDetail";
import { readCoreData } from "../../scripts/lib/data";

test.describe("needsUpdate()", () => {
  test("returns false if everything is older than globalLastUpdated", () => {
    const entryTime = parseDatetime("May 5, 2023, 8:00:00 AM PDT");
    const entry = {
      reportLastUpdated: entryTime,
      cityLastUpdated: entryTime,
      citations: [
        {
          lastUpdated: entryTime,
        },
      ],
    } as PlaceEntry;
    const globalLastUpdated = parseDatetime("May 8, 2023, 8:00:00 AM PDT");
    expect(needsUpdate(entry, globalLastUpdated)).toBe(false);
  });

  test("returns true if the report has been updated recently", () => {
    const entryTime = parseDatetime("May 5, 2023, 8:00:00 AM PDT");
    const entry = {
      reportLastUpdated: parseDatetime("May 10, 2023, 8:00:00 AM PDT"),
      cityLastUpdated: entryTime,
      citations: [
        {
          lastUpdated: entryTime,
        },
      ],
    } as PlaceEntry;
    const globalLastUpdated = parseDatetime("May 6, 2023, 8:00:00 AM PDT");
    expect(needsUpdate(entry, globalLastUpdated)).toBe(true);
  });

  test("returns true if the city has been updated recently", () => {
    const entryTime = parseDatetime("May 5, 2023, 8:00:00 AM PDT");
    const entry = {
      reportLastUpdated: entryTime,
      cityLastUpdated: parseDatetime("May 10, 2023, 8:00:00 AM PDT"),
      citations: [
        {
          lastUpdated: entryTime,
        },
      ],
    } as PlaceEntry;
    const globalLastUpdated = parseDatetime("May 6, 2023, 8:00:00 AM PDT");
    expect(needsUpdate(entry, globalLastUpdated)).toBe(true);
  });

  test("returns true if at least one of the citations has been updated recently", () => {
    const entryTime = parseDatetime("May 5, 2023, 8:00:00 AM PDT");
    const entry = {
      reportLastUpdated: entryTime,
      cityLastUpdated: entryTime,
      citations: [
        {
          lastUpdated: entryTime,
        },
        {
          lastUpdated: parseDatetime("May 10, 2023, 8:00:00 AM PDT"),
        },
      ],
    } as PlaceEntry;
    const globalLastUpdated = parseDatetime("May 6, 2023, 8:00:00 AM PDT");
    expect(needsUpdate(entry, globalLastUpdated)).toBe(true);
  });

  test("can handle different time zones", () => {
    const entryTime = parseDatetime("May 5, 2023, 8:00:00 AM PDT");
    const entry = {
      reportLastUpdated: entryTime,
      cityLastUpdated: parseDatetime("May 6, 2023, 12:00:00 PM PDT"),
      citations: [
        {
          lastUpdated: entryTime,
        },
      ],
    } as PlaceEntry;
    // Even though 11 AM is naively earlier than 12 PM, due to time zones, the globalLastUpdated
    // happens after any of the city updates.
    let globalLastUpdated = parseDatetime(
      "May 6, 2023, 11:00:00 AM Pacific/Honolulu",
      false,
    );
    expect(needsUpdate(entry, globalLastUpdated)).toBe(false);

    // To be extra sure, we ensure that the same time zone would return true.
    globalLastUpdated = parseDatetime("May 6, 2023, 11:00:00 AM PDT");
    expect(needsUpdate(entry, globalLastUpdated)).toBe(true);
  });
});

test("normalizeAttachments() converts string entries into objects", () => {
  expect(normalizeAttachments("", 1, "My City, AZ")).toEqual([]);

  expect(
    normalizeAttachments("https://prn.org/photo1.png", 1, "My City, AZ"),
  ).toEqual([
    {
      url: "https://prn.org/photo1.png",
      fileName: "photo1.png",
      isDoc: false,
      outputPath: "attachment_images/MyCity_AZ_1_1.png",
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
      fileName: "doc1.pdf",
      isDoc: true,
      outputPath: "attachment_images/MyCity_AZ_2_1.pdf",
    },
    {
      url: "https://prn.org/img2.jpg",
      fileName: "img2.jpg",
      isDoc: false,
      outputPath: "attachment_images/MyCity_AZ_2_2.jpg",
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

test("every place has a corresponding HTML page", async () => {
  const htmlPages = await fs.readdir("city_detail/");
  const validUrls = new Set(
    htmlPages.map(
      (fileName) =>
        `https://parkingreform.org/mandates-map/city_detail/${fileName}`,
    ),
  );

  const data = await readCoreData();
  Object.values(data).forEach((row) => expect(validUrls).toContain(row.url));
});
