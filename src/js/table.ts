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
} from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";
import { DateTime } from "luxon";

import { PlaceFilterManager } from "./FilterState";

function compareDates(a: string, b: string): number {
  const dateA = DateTime.fromFormat(a, "LLL d, yyyy");
  const dateB = DateTime.fromFormat(b, "LLL d, yyyy");
  if (!dateA.isValid) return 1;
  if (!dateB.isValid) return -1;
  return dateA.valueOf() - dateB.valueOf();
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
      population: parseInt(entry.population).toLocaleString("en-us"),
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
      sorter: compareDates,
    },
    {
      title: "Policy change",
      field: "policyChange",
      width: 260,
      sorter: "array",
    },
    {
      title: "Scope",
      field: "scope",
      width: 260,
      sorter: "array",
    },
    {
      title: "Land use",
      field: "landUse",
      width: 160,
      sorter: "array",
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
