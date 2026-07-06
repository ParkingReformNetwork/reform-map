import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import {
  assertNumPlaces,
  DEFAULT_PLACE_RANGE,
  HEADER_ICON,
  loadMap,
} from "./utils";

async function openSearch(page: Page): Promise<void> {
  await page.locator(HEADER_ICON.search).click();
  // div.choices is position:fixed so #search-popup has zero intrinsic height;
  // wait for the auto-opened dropdown itself instead
  await page.locator(".choices__list--dropdown").waitFor({ state: "visible" });
}

async function searchFor(page: Page, text: string): Promise<void> {
  // pressSequentially fires per-keystroke events that Choices.js listens to;
  // fill() only fires a synthetic input event which Choices.js ignores
  await page.locator("input.choices__input").pressSequentially(text);
}

async function getDropdownLabels(page: Page): Promise<string[]> {
  const items = page.locator(
    ".choices__list--dropdown .choices__item--selectable:not(.choices__placeholder)",
  );
  return items.allInnerTexts();
}

test("search changes what is shown", async ({ page }) => {
  await loadMap(page);
  await openSearch(page);

  await page
    .locator(".choices__list--dropdown > .choices__list > .choices__item")
    .nth(2)
    .click();
  await assertNumPlaces(page, [1, 1]);

  // Removing the selected place, by closing scorecard, restores all.
  await page.locator(".scorecard-close-icon-container").click();
  await assertNumPlaces(page, DEFAULT_PLACE_RANGE);
});

interface SearchCase {
  desc: string;
  query: string;
  minResults?: number;
  matchAll?: RegExp;
  excludes?: RegExp;
  firstLabel?: string;
  includesLabel?: string;
}

const TESTS: SearchCase[] = [
  {
    desc: "typing 'Springfield' shows more than 4 results",
    query: "Springfield",
    minResults: 5,
    matchAll: /Springfield/i,
  },
  {
    desc: "typing 'Springfield, Ohio' narrows to Springfield OH",
    query: "Springfield, Ohio",
    firstLabel: "Springfield, Ohio, United States",
  },
  {
    desc: "typing 'Springfield Ohio' (no comma) narrows to Springfield OH",
    query: "Springfield Ohio",
    firstLabel: "Springfield, Ohio, United States",
  },
  {
    desc: "typing 'Salem' shows more than 4 results",
    query: "Salem",
    minResults: 5,
    matchAll: /Salem/i,
  },
  {
    desc: "typing 'Salem, Oregon' shows Salem OR and not Alamogordo",
    query: "Salem, Oregon",
    firstLabel: "Salem, Oregon, United States",
    excludes: /Alamogordo/i,
  },
  {
    desc: "typing 'California' includes 'California, United States'",
    query: "California",
    includesLabel: "California, United States",
  },
  {
    desc: "typing 'Salem Oregon' (no comma) shows Salem OR",
    query: "Salem Oregon",
    firstLabel: "Salem, Oregon, United States",
  },
];

for (const searchCase of TESTS) {
  test(`search: ${searchCase.desc}`, async ({ page }) => {
    await loadMap(page);
    await openSearch(page);
    await searchFor(page, searchCase.query);

    const labels = await getDropdownLabels(page);

    if (searchCase.minResults !== undefined) {
      expect(labels.length).toBeGreaterThanOrEqual(searchCase.minResults);
    }
    if (searchCase.matchAll) {
      for (const label of labels) {
        expect(label).toMatch(searchCase.matchAll);
      }
    }
    if (searchCase.excludes) {
      expect(labels.some((l) => searchCase.excludes?.test(l))).toBe(false);
    }
    if (searchCase.firstLabel !== undefined) {
      expect(labels[0]).toBe(searchCase.firstLabel);
    }
    if (searchCase.includesLabel !== undefined) {
      expect(labels).toContain(searchCase.includesLabel);
    }
  });
}
