import { expect, test } from "@playwright/test";

import type {
  CellComponent,
  ColumnComponent,
  RowComponent,
  SortDirection,
} from "tabulator-tables";
import { ReformDate } from "../../src/js/model/ReformDate";
import type { PlaceId, ProcessedCoreEntry } from "../../src/js/model/types";
import type { PlaceMatch } from "../../src/js/state/FilterState";
import {
  buildTableData,
  compareDates,
  compareStringArrays,
  formatStringArrays,
  rowMatchesFilter,
  tableDownloadFileName,
} from "../../src/js/table";
import { makeEntry, makePlace } from "./utils";

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
      ReformDate.fromNullable(a),
      ReformDate.fromNullable(b),
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

function cell(value: unknown): CellComponent {
  return { getValue: () => value } as CellComponent;
}

test("formatStringArrays joins with '; ' and renders null as empty", () => {
  expect(formatStringArrays(cell(["commercial", "residential"]))).toEqual(
    "commercial; residential",
  );
  expect(formatStringArrays(cell([]))).toEqual("");
  expect(formatStringArrays(cell(null))).toEqual("");
});

test("compareStringArrays orders by comma-joined key", () => {
  // The display formatter joins with "; " but the sort key joins with ","; the
  // two are intentionally different, so we assert the sort behavior directly.
  expect(compareStringArrays(["a"], ["b"])).toBeLessThan(0);
  expect(compareStringArrays(["b"], ["a"])).toBeGreaterThan(0);
  expect(compareStringArrays(["a", "b"], ["a", "b"])).toBe(0);
  expect(compareStringArrays(["a", "b"], ["a", "c"])).toBeLessThan(0);
});

test("rowMatchesFilter", () => {
  const matched: Record<PlaceId, PlaceMatch> = {
    AnyPlace: { type: "any", policyTypes: ["reduce parking minimums"] },
    SearchPlace: { type: "search" },
    SinglePlace: {
      type: "single policy",
      policyType: "add parking maximums",
      matchingIndexes: [1],
    },
  };

  // Unknown place is never shown.
  expect(
    rowMatchesFilter(
      { placeId: "Unknown" },
      matched,
      "any parking reform",
      "adopted",
    ),
  ).toBe(false);

  // "any" matches regardless of the row's status.
  expect(
    rowMatchesFilter(
      { placeId: "AnyPlace", status: "repealed" },
      matched,
      "any parking reform",
      "adopted",
    ),
  ).toBe(true);

  // Search under "any parking reform" ignores the row's status, because each
  // status already has its own dataset.
  expect(
    rowMatchesFilter(
      { placeId: "SearchPlace", status: "repealed" },
      matched,
      "any parking reform",
      "adopted",
    ),
  ).toBe(true);

  // Search under a single-policy dataset must still respect the loaded status.
  expect(
    rowMatchesFilter(
      { placeId: "SearchPlace", status: "adopted" },
      matched,
      "reduce parking minimums",
      "adopted",
    ),
  ).toBe(true);
  expect(
    rowMatchesFilter(
      { placeId: "SearchPlace", status: "proposed" },
      matched,
      "reduce parking minimums",
      "adopted",
    ),
  ).toBe(false);

  // Single-policy rows are shown only for matching policy indexes.
  expect(
    rowMatchesFilter(
      { placeId: "SinglePlace", policyIdx: 1 },
      matched,
      "add parking maximums",
      "adopted",
    ),
  ).toBe(true);
  expect(
    rowMatchesFilter(
      { placeId: "SinglePlace", policyIdx: 0 },
      matched,
      "add parking maximums",
      "adopted",
    ),
  ).toBe(false);
});

test("buildTableData", () => {
  const entries: Record<PlaceId, ProcessedCoreEntry> = {
    Springfield: makeEntry({
      place: makePlace({
        name: "Springfield",
        state: "IL",
        pop: 48100,
        url: "https://example.com/springfield",
      }),
      reduce_min: [
        {
          status: "adopted",
          scope: ["citywide"],
          land: ["all uses"],
          date: new ReformDate("2024-05"),
        },
      ],
      add_max: [
        {
          status: "proposed",
          scope: ["city center / business district"],
          land: ["commercial"],
          date: undefined,
        },
      ],
    }),
    Metropolis: makeEntry({
      place: makePlace({
        name: "Metropolis",
        state: null,
        type: "country",
        pop: 1200000,
        repeal: undefined,
      }),
      benefit_district: [{ status: "adopted", date: new ReformDate("2020") }],
    }),
  };

  const data = buildTableData(entries);

  // Population is a locale string, which is why the column uses a number sorter
  // configured with a thousand separator.
  const springfieldAdopted = data.any.adopted.find(
    (row) => row.placeId === "Springfield",
  );
  expect(springfieldAdopted?.population).toEqual("48,100");
  const metropolisAdopted = data.any.adopted.find(
    (row) => row.placeId === "Metropolis",
  );
  expect(metropolisAdopted?.population).toEqual("1,200,000");

  // "any parking reform" booleans are computed per status. Springfield adopted a
  // reduce-minimums reform but only proposed the add-maximums one.
  expect(springfieldAdopted).toMatchObject({
    reduceMin: true,
    rmMin: false,
    addMax: false,
    benefitDistrict: false,
  });
  const springfieldProposed = data.any.proposed.find(
    (row) => row.placeId === "Springfield",
  );
  expect(springfieldProposed).toMatchObject({
    reduceMin: false,
    addMax: true,
  });
  expect(metropolisAdopted).toMatchObject({ benefitDistrict: true });

  // Land-use rows are tagged with their policy index and status.
  expect(data.reduceMin).toHaveLength(1);
  expect(data.reduceMin[0]).toMatchObject({
    placeId: "Springfield",
    policyIdx: 0,
    status: "adopted",
    landUse: ["all uses"],
    scope: ["citywide"],
  });
  expect(data.addMax).toHaveLength(1);
  expect(data.addMax[0]).toMatchObject({ policyIdx: 0, status: "proposed" });
  expect(data.rmMin).toHaveLength(0);

  // Benefit-district rows carry no scope/land.
  expect(data.benefitDistrict).toHaveLength(1);
  expect(data.benefitDistrict[0]).toMatchObject({
    placeId: "Metropolis",
    policyIdx: 0,
    status: "adopted",
  });
  expect(data.benefitDistrict[0].scope).toBeUndefined();
  expect(data.benefitDistrict[0].landUse).toBeUndefined();
});
