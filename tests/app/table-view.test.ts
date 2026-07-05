import { expect, type Page, test } from "@playwright/test";
import { loadMap, openFilter } from "./utils";

/** Switch to the table view and wait for it to become visible. */
async function showTable(page: Page): Promise<void> {
  await page.locator(".header-table-icon-container").click();
  await expect(page.locator("#table-view")).toBeVisible();
}

/** Number of rows currently passing the table's filter. */
function activeRowCount(page: Page): Promise<number> {
  return page.evaluate(
    () => window.tableTestHandles?.table.getData("active").length ?? 0,
  );
}

/** The `field`s of the table's currently loaded columns. */
function columnFields(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      window.tableTestHandles?.table
        .getColumnDefinitions()
        .map((column) => column.field ?? "") ?? [],
  );
}

/**
 * Poll until the active row count settles below `baseline`, returning that count.
 */
async function pollNarrowedRowCount(
  page: Page,
  baseline: number,
): Promise<number> {
  let narrowed = baseline;
  await expect
    .poll(async () => {
      narrowed = await activeRowCount(page);
      return narrowed;
    })
    .toBeLessThan(baseline);
  return narrowed;
}

test("switching policy type loads different columns", async ({ page }) => {
  await loadMap(page);
  await showTable(page);

  // "any parking reform" (the default) shows the per-policy boolean columns.
  expect(await columnFields(page)).toEqual(
    expect.arrayContaining(["reduceMin", "rmMin", "addMax", "benefitDistrict"]),
  );

  await openFilter(page);
  await page
    .locator("#filter-policy-type-dropdown")
    .selectOption("reduce parking minimums");
  // A land-use dataset swaps in the scope/land columns instead.
  await expect
    .poll(() => columnFields(page))
    .toEqual(expect.arrayContaining(["date", "scope", "landUse"]));
  expect(await columnFields(page)).not.toContain("reduceMin");

  await page
    .locator("#filter-policy-type-dropdown")
    .selectOption("parking benefit district");
  // Benefit districts have a date but no scope/land.
  await expect.poll(() => columnFields(page)).toContain("date");
  expect(await columnFields(page)).not.toContain("scope");
  expect(await columnFields(page)).not.toContain("landUse");
});

test("filtering narrows the visible rows", async ({ page }) => {
  await loadMap(page);
  await showTable(page);
  const baseline = await activeRowCount(page);

  await openFilter(page);
  // Restrict to a single small country; the row set should shrink.
  await page.locator("#filter-accordion-toggle-country").click();
  await page.locator("#filter-country-uncheck-all").click();
  await page
    .locator('.filter-country label:has(input[data-value="Mexico"])')
    .click();

  const narrowed = await pollNarrowedRowCount(page, baseline);
  expect(narrowed).toBeGreaterThan(0);
});

test("download button uses the current dataset's filename", async ({
  page,
}) => {
  await loadMap(page);
  await showTable(page);

  const downloadPromise = page.waitForEvent("download");
  await page.locator(".counter-table-download").click();
  const download = await downloadPromise;
  // Default dataset is "any parking reform" + "adopted".
  expect(download.suggestedFilename()).toEqual(
    "parking-reforms--overview--adopted.csv",
  );
});

test("filtering while on map view is applied when switching to the table", async ({
  page,
}) => {
  await loadMap(page);
  // Establish the unfiltered baseline, then return to the map.
  await showTable(page);
  const baseline = await activeRowCount(page);
  await page.locator(".header-map-icon-container").click();
  await expect(page.locator("#table-view")).toBeHidden();

  // Filter while the table is hidden (this refresh is queued, not applied yet).
  await openFilter(page);
  await page.locator("#filter-accordion-toggle-country").click();
  await page.locator("#filter-country-uncheck-all").click();
  await page
    .locator('.filter-country label:has(input[data-value="Mexico"])')
    .click();

  // Switching back to the table should apply the queued refresh.
  await showTable(page);
  const narrowed = await pollNarrowedRowCount(page, baseline);
  expect(narrowed).toBeGreaterThan(0);
});
