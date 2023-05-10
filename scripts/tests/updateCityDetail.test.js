const { describe, expect, test } = require("@jest/globals");
const { needsUpdate, parseDatetime } = require("../updateCityDetail");

describe("needsUpdate()", () => {
  test("returns false if everything is older than globalLastUpdated", () => {
    const entryTime = "May 5, 2023, 8:00:00 AM PDT";
    const entries = [
      {
        "Last updated": entryTime,
        "Report Last updated": entryTime,
        "City Last Updated": entryTime,
      },
      {
        "Last updated": "May 4, 2023, 8:00:00 AM PDT",
        "Report Last updated": entryTime,
        "City Last Updated": entryTime,
      },
    ];
    const globalLastUpdated = parseDatetime("May 8, 2023, 8:00:00 AM PDT");
    expect(needsUpdate(entries, globalLastUpdated)).toBe(false);
  });

  test("returns true if the report has been updated recently", () => {
    const entryTime = "May 5, 2023, 8:00:00 AM PDT";
    const entries = [
      {
        "Last updated": entryTime,
        "Report Last updated": "May 10, 2023, 8:00:00 AM PDT",
        "City Last Updated": entryTime,
      },
      {
        "Last updated": entryTime,
        "Report Last updated": "May 10, 2023, 8:00:00 AM PDT",
        "City Last Updated": entryTime,
      },
    ];
    const globalLastUpdated = parseDatetime("May 6, 2023, 8:00:00 AM PDT");
    expect(needsUpdate(entries, globalLastUpdated)).toBe(true);
  });

  test("returns true if the city has been updated recently", () => {
    const entryTime = "May 5, 2023, 8:00:00 AM PDT";
    const entries = [
      {
        "Last updated": entryTime,
        "Report Last updated": entryTime,
        "City Last Updated": "May 10, 2023, 8:00:00 AM PDT",
      },
      {
        "Last updated": entryTime,
        "Report Last updated": entryTime,
        "City Last Updated": "May 10, 2023, 8:00:00 AM PDT",
      },
    ];
    const globalLastUpdated = parseDatetime("May 6, 2023, 8:00:00 AM PDT");
    expect(needsUpdate(entries, globalLastUpdated)).toBe(true);
  });

  test("returns true if at least one of the citations has been updated recently", () => {
    const entryTime = "May 5, 2023, 8:00:00 AM PDT";
    const entries = [
      {
        "Last updated": entryTime,
        "Report Last updated": entryTime,
        "City Last Updated": entryTime,
      },
      {
        "Last updated": "May 10, 2023, 8:00:00 AM PDT",
        "Report Last updated": entryTime,
        "City Last Updated": entryTime,
      },
    ];
    const globalLastUpdated = parseDatetime("May 6, 2023, 8:00:00 AM PDT");
    expect(needsUpdate(entries, globalLastUpdated)).toBe(true);
  });

  test("can handle different time zones", () => {
    const entryTime = "May 5, 2023, 8:00:00 AM PDT";
    const entries = [
      {
        "Last updated": "May 6, 2023, 12:00:00 PM PDT",
        "Report Last updated": entryTime,
        "City Last Updated": entryTime,
      },
      {
        "Last updated": entryTime,
        "Report Last updated": entryTime,
        "City Last Updated": entryTime,
      },
    ];
    // Even though 11 AM is naively earlier than 12 PM, due to time zones, the globalLastUpdated
    // happens after any of the city updates.
    let globalLastUpdated = parseDatetime(
      "May 6, 2023, 11:00:00 AM Pacific/Honolulu",
      false
    );
    expect(needsUpdate(entries, globalLastUpdated)).toBe(false);

    // To be extra sure, we ensure that the time zone would return true.
    globalLastUpdated = parseDatetime("May 6, 2023, 11:00:00 AM PDT");
    expect(needsUpdate(entries, globalLastUpdated)).toBe(true);
  });
});
