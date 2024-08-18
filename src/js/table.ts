import {
  Tabulator,
  FilterModule,
  FormatModule,
  SortModule,
  ResizeColumnsModule,
  MoveColumnsModule,
  ColumnDefinition,
  FrozenColumnsModule,
  PageModule,
  CellComponent,
} from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";
import { DateTime } from "luxon";

import { PlaceFilterManager } from "./FilterState";
import { DATE_REPR } from "./data";

function formatDate(cell: CellComponent): string {
  const v = cell.getValue() as DateTime | null;
  return v ? v.toFormat(DATE_REPR) : "";
}

function compareDates(a: DateTime | null, b: DateTime | null): number {
  if (!a) return 1;
  if (!b) return -1;
  return a.valueOf() - b.valueOf();
}

function compareStringArrays(a: string[], b: string[]): number {
  return a.join(",").localeCompare(b.join(","));
}

export default function initTable(
  filterManager: PlaceFilterManager,
): Tabulator {
  Tabulator.registerModule([
    FilterModule,
    FormatModule,
    FrozenColumnsModule,
    SortModule,
    ResizeColumnsModule,
    MoveColumnsModule,
    PageModule,
  ]);

  const data = Object.entries(filterManager.entries).map(
    ([placeId, entry]) => ({
      id: placeId,
      place: entry.place,
      state: entry.state,
      country: entry.country,
      population: entry.population.toLocaleString("en-us"),
      date: entry.reformDate,
      url: entry.url,
      status: entry.status,
      landUse: entry.landUse,
      policyChange: entry.policyChange,
      scope: entry.scope,
    }),
  );
  const columns: ColumnDefinition[] = [
    {
      title: "Place",
      field: "place",
      width: 180,
      frozen: true,
      formatter: "link",
      formatterParams: {
        urlField: "url",
        labelField: "place",
        target: "_blank",
      },
    },
    { title: "State", field: "state", width: 70 },
    { title: "Country", field: "country", width: 70 },
    {
      title: "Population",
      field: "population",
      sorter: "number",
      sorterParams: {
        // @ts-ignore
        thousandSeparator: ",",
      },
      width: 90,
    },
    {
      title: "Date",
      field: "date",
      width: 110,
      formatter: formatDate,
      sorter: compareDates,
    },
    {
      title: "Policy change",
      field: "policyChange",
      width: 260,
      sorter: compareStringArrays,
    },
    {
      title: "Scope",
      field: "scope",
      width: 260,
      sorter: compareStringArrays,
    },
    {
      title: "Land use",
      field: "landUse",
      width: 160,
      sorter: compareStringArrays,
    },
    {
      title: "Status",
      field: "status",
      width: 120,
    },
  ];

  const table = new Tabulator("#table", {
    data,
    columns,
    layout: "fitColumns",
    movableColumns: true,
    // We use pagination to avoid performance issues.
    pagination: true,
    paginationSize: 100,
    paginationCounter: (
      _pageSize,
      _currentRow,
      currentPage,
      _totalRows,
      totalPages,
    ) => `Page ${currentPage} of ${totalPages}`,
  });

  let tableBuilt = false;
  table.on("tableBuilt", () => {
    tableBuilt = true;
    table.setFilter((row) => filterManager.placeIds.has(row.id));
  });
  filterManager.subscribe(() => {
    if (!tableBuilt) return;
    table.refreshFilter();
  });

  return table;
}
