import { expect, test } from "@playwright/test";

import {
  extractCitationIdAndLinks,
  readCitationIdAndLinks,
} from "../../scripts/brokenLinks";
import type { Citation, ExtendedEntry } from "../../scripts/lib/data";

function makeCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    id: 0,
    description: "citation",
    url: "https://example.com",
    notes: null,
    attachments: [],
    screenshots: [],
    ...overrides,
  };
}

test("extractCitationIdAndLinks() pairs each citation's id with its url", () => {
  const data: Record<string, ExtendedEntry> = {
    "Chicago, IL": {
      add_max: [
        {
          summary: "summary",
          reporter: null,
          requirements: [],
          citations: [
            makeCitation({ id: 1, url: "https://chicago.example.com" }),
          ],
        },
      ],
      rm_min: [
        {
          summary: "summary",
          reporter: null,
          requirements: [],
          citations: [
            makeCitation({ id: 2, url: "https://rm-min.example.com" }),
          ],
        },
      ],
    },
  };

  expect(extractCitationIdAndLinks(data)).toEqual([
    [1, "https://chicago.example.com"],
    [2, "https://rm-min.example.com"],
  ]);
});

test("extractCitationIdAndLinks() filters out citations with a null url", () => {
  const data: Record<string, ExtendedEntry> = {
    "Chicago, IL": {
      add_max: [
        {
          summary: "summary",
          reporter: null,
          requirements: [],
          citations: [
            makeCitation({ id: 1, url: null }),
            makeCitation({ id: 2, url: "https://example.com" }),
          ],
        },
      ],
    },
  };

  expect(extractCitationIdAndLinks(data)).toEqual([[2, "https://example.com"]]);
});

test("data integrity: readCitationIdAndLinks() returns well-formed pairs from real data", async () => {
  const citationIdAndLinks = await readCitationIdAndLinks();
  expect(citationIdAndLinks.length).toBeGreaterThan(0);
  for (const [id, url] of citationIdAndLinks) {
    expect(typeof id).toBe("number");
    expect(() => new URL(url)).not.toThrow();
  }
});
