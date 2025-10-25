import { expect, test } from "@playwright/test";

import { ColumnComponent, RowComponent, SortDirection } from "tabulator-tables";
import { compareDates, tableDownloadFileName } from "../../src/js/table";
import { Date } from "../../src/js/model/types";

test("tableDownloadFileName()", () => {
  expect(tableDownloadFileName("any parking reform", "adopted")).toEqual(
    "parking-reforms--overview--adopted.csv",
  );
  expect(tableDownloadFileName("any parking reform", "proposed")).toEqual(
    "parking-reforms--overview--proposed.csv",
  );
  expect(tableDownloadFileName("any parking reform", "repealed")).toEqual(
    "parking-reforms--overview--repealed.csv",
  );
  expect(tableDownloadFileName("add parking maximums", "adopted")).toEqual(
    "parking-reforms--maximums--adopted.csv",
  );
  expect(tableDownloadFileName("reduce parking minimums", "adopted")).toEqual(
    "parking-reforms--reduce-minimums--adopted.csv",
  );
  expect(tableDownloadFileName("remove parking minimums", "adopted")).toEqual(
    "parking-reforms--remove-minimums--adopted.csv",
  );
  expect(tableDownloadFileName("parking benefit district", "adopted")).toEqual(
    "parking-reforms--benefit-district--adopted.csv",
  );
});

test("compareDates handles descending and ascending", () => {
  const compare = (
    a: string | undefined,
    b: string | undefined,
    dir: SortDirection,
  ): number =>
    compareDates(
      Date.fromNullable(a),
      Date.fromNullable(b),
      {} as RowComponent,
      {} as RowComponent,
      {} as ColumnComponent,
      dir,
    );

  // Asc = oldest to newest
  expect(compare("2024", "2025", "asc")).toBeLessThan(0);
  expect(compare("2025", "2024", "asc")).toBeGreaterThan(0);
  expect(compare("2024", "2024", "asc")).toBe(0);
  expect(compare(undefined, "2024", "asc")).toBeGreaterThan(0);
  expect(compare("2024", undefined, "asc")).toBeLessThan(0);
  expect(compare(undefined, undefined, "asc")).toBe(0);

  // Desc = newest to oldest
  expect(compare("2024", "2025", "desc")).toBeLessThan(0);
  expect(compare("2025", "2024", "desc")).toBeGreaterThan(0);
  expect(compare("2024", "2024", "desc")).toBe(0);
  expect(compare(undefined, "2024", "desc")).toBeLessThan(0);
  expect(compare("2024", undefined, "desc")).toBeGreaterThan(0);
  expect(compare(undefined, undefined, "desc")).toBe(0);
});
