import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  assertNumPlaces,
  loadMap,
  openFilter,
  DEFAULT_PLACE_RANGE,
} from "./utils";

async function openSearch(page: Page): Promise<void> {
  await page.locator(".header-search-icon-container").click();
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
  await openFilter(page);

  await page.locator(".header-search-icon-container").click();
  await page
    .locator(".choices__list--dropdown > .choices__list > .choices__item")
    .nth(2)
    .click();
  await assertNumPlaces(page, [1, 1]);

  // Removing the selected place, by closing scorecard, restores all.
  await page.locator(".scorecard-close-icon-container").click();
  await assertNumPlaces(page, DEFAULT_PLACE_RANGE);
});

test("search: typing 'Springfield' shows more than 4 results", async ({
  page,
}) => {
  await loadMap(page);
  await openSearch(page);
  await searchFor(page, "Springfield");

  const labels = await getDropdownLabels(page);
  expect(labels.length).toBeGreaterThanOrEqual(5);
  for (const label of labels) {
    expect(label).toMatch(/Springfield/i);
  }
});

test("search: typing 'Springfield, Ohio' narrows to Springfield OH", async ({
  page,
}) => {
  await loadMap(page);
  await openSearch(page);
  await searchFor(page, "Springfield, Ohio");

  const labels = await getDropdownLabels(page);
  expect(labels[0]).toBe("Springfield, Ohio, United States");
});

test("search: typing 'Springfield Ohio' (no comma) narrows to Springfield OH", async ({
  page,
}) => {
  await loadMap(page);
  await openSearch(page);
  await searchFor(page, "Springfield Ohio");

  const labels = await getDropdownLabels(page);
  expect(labels[0]).toBe("Springfield, Ohio, United States");
});

test("search: typing 'Salem' shows more than 4 results", async ({ page }) => {
  await loadMap(page);
  await openSearch(page);
  await searchFor(page, "Salem");

  const labels = await getDropdownLabels(page);
  expect(labels.length).toBeGreaterThanOrEqual(5);
  for (const label of labels) {
    expect(label).toMatch(/Salem/i);
  }
});

test("search: typing 'Salem, Oregon' shows Salem OR and not Alamogordo", async ({
  page,
}) => {
  await loadMap(page);
  await openSearch(page);
  await searchFor(page, "Salem, Oregon");

  const labels = await getDropdownLabels(page);
  expect(labels[0]).toBe("Salem, Oregon, United States");
  expect(labels.some((l) => /Alamogordo/i.test(l))).toBe(false);
});

test("search: typing 'California' includes 'California, United States'", async ({
  page,
}) => {
  await loadMap(page);
  await openSearch(page);
  await searchFor(page, "California");

  const labels = await getDropdownLabels(page);
  expect(labels).toContain("California, United States");
});

test("search: typing 'Salem Oregon' (no comma) shows Salem OR", async ({
  page,
}) => {
  await loadMap(page);
  await openSearch(page);
  await searchFor(page, "Salem Oregon");

  const labels = await getDropdownLabels(page);
  expect(labels[0]).toBe("Salem, Oregon, United States");
});
