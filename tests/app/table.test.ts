import { expect, test } from "@playwright/test";

import { ColumnComponent, RowComponent, SortDirection } from "tabulator-tables";
import { compareDates } from "../../src/js/table";
import { Date } from "../../src/js/model/types";

test("compareDates handles descending and ascending", () => {
  const compare = (
    a: string | null,
    b: string | null,
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
  expect(compare(null, "2024", "asc")).toBeGreaterThan(0);
  expect(compare("2024", null, "asc")).toBeLessThan(0);
  expect(compare(null, null, "asc")).toBe(0);

  // Desc = newest to oldest
  expect(compare("2024", "2025", "desc")).toBeLessThan(0);
  expect(compare("2025", "2024", "desc")).toBeGreaterThan(0);
  expect(compare("2024", "2024", "desc")).toBe(0);
  expect(compare(null, "2024", "desc")).toBeLessThan(0);
  expect(compare("2024", null, "desc")).toBeGreaterThan(0);
  expect(compare(null, null, "desc")).toBe(0);
});
