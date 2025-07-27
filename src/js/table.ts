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
  RowComponent,
  SortDirection,
  ColumnComponent,
} from "tabulator-tables";

import { PlaceFilterManager, PolicyTypeFilter } from "./state/FilterState";
import { Date, ProcessedCorePolicy, ReformStatus } from "./model/types";
import { ViewStateObservable } from "./layout/viewToggle";
import { determineAllPolicyTypes } from "./model/data";

function formatBoolean(cell: CellComponent): string {
  const v = cell.getValue() as boolean;
  return v ? "✓" : "";
}

function formatDate(cell: CellComponent): string {
  const v = cell.getValue() as Date | null;
  return v ? v.format() : "";
}

export function compareDates(
  a: Date | null,
  b: Date | null,
  _aRow: RowComponent,
  _bRow: RowComponent,
  _col: ColumnComponent,
  dir: SortDirection,
): number {
  if (a === b) return 0;
  if (dir === "asc") {
    if (!a) return 1;
    if (!b) return -1;
  } else {
    if (!a) return -1;
    if (!b) return 1;
  }
  return a.parsed.valueOf() - b.parsed.valueOf();
}

function compareStringArrays(a: string[], b: string[]): number {
  return a.join(",").localeCompare(b.join(","));
}

function formatStringArrays(cell: CellComponent): string {
  const v = cell.getValue() as string[] | null;
  return v ? v.join("; ") : "";
}

const PLACE_COLUMNS: ColumnDefinition[] = [
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
  { title: "Country", field: "country", width: 110 },
  { title: "Jurisdiction", field: "placeType", width: 80 },
  {
    title: "Population",
    field: "population",
    sorter: "number",
    sorterParams: {
      // @ts-expect-error type hint is wrong
      thousandSeparator: ",",
    },
    width: 90,
  },
];

const POLICY_COLUMNS: ColumnDefinition[] = [
  {
    title: "Date",
    field: "date",
    width: 110,
    formatter: formatDate,
    sorter: compareDates,
  },
  {
    title: "Scope",
    field: "scope",
    width: 260,
    formatter: formatStringArrays,
    sorter: compareStringArrays,
  },
  {
    title: "Land use",
    field: "landUse",
    width: 160,
    formatter: formatStringArrays,
    sorter: compareStringArrays,
  },
];

const SINGLE_POLICY_COLUMNS: ColumnDefinition[] = [
  ...PLACE_COLUMNS,
  ...POLICY_COLUMNS,
];
const ANY_REFORM_COLUMNS: ColumnDefinition[] = [
  ...PLACE_COLUMNS,
  {
    title: "Reduce minimums",
    field: "reduceMin",
    width: 120,
    formatter: formatBoolean,
    hozAlign: "center",
  },
  {
    title: "Remove minimums",
    field: "rmMin",
    width: 120,
    formatter: formatBoolean,
    hozAlign: "center",
  },
  {
    title: "Add maximums",
    field: "addMax",
    width: 120,
    formatter: formatBoolean,
    hozAlign: "center",
  },
];

export default function initTable(
  filterManager: PlaceFilterManager,
  viewToggle: ViewStateObservable,
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

  // For "any parking reform", we need distinct datasets for each ReformStatus because the
  // column values change. Whereas for the SinglePolicy datasets, we can use a
  // single dataset for all the statuses because the filter code (from FilterState)
  // will already filter out records that don't match the current status.
  const dataAnyAdopted: any[] = [];
  const dataAnyProposed: any[] = [];
  const dataAnyRepealed: any[] = [];
  const dataReduceMin: any[] = [];
  const dataRmMin: any[] = [];
  const dataAddMax: any[] = [];
  Object.entries(filterManager.entries).forEach(([placeId, entry]) => {
    const common = {
      placeId,
      place: entry.place.name,
      state: entry.place.state,
      country: entry.place.country,
      placeType: entry.place.type,
      population: entry.place.pop.toLocaleString("en-us"),
      url: entry.place.url,
    };

    const adopted = determineAllPolicyTypes(entry, "adopted");
    dataAnyAdopted.push({
      ...common,
      reduceMin: adopted.includes("reduce parking minimums"),
      rmMin: adopted.includes("remove parking minimums"),
      addMax: adopted.includes("add parking maximums"),
    });
    const proposed = determineAllPolicyTypes(entry, "proposed");
    dataAnyProposed.push({
      ...common,
      reduceMin: proposed.includes("reduce parking minimums"),
      rmMin: proposed.includes("remove parking minimums"),
      addMax: proposed.includes("add parking maximums"),
    });
    const repealed = determineAllPolicyTypes(entry, "repealed");
    dataAnyRepealed.push({
      ...common,
      reduceMin: repealed.includes("reduce parking minimums"),
      rmMin: repealed.includes("remove parking minimums"),
      addMax: repealed.includes("add parking maximums"),
    });

    const savePolicies = (
      collection: any[],
      policies: ProcessedCorePolicy[] | undefined,
    ): void =>
      policies?.forEach((policy, i) =>
        collection.push({
          ...common,
          policyIdx: i,
          date: policy.date,
          status: policy.status,
          landUse: policy.land,
          scope: policy.scope,
        }),
      );

    savePolicies(dataAddMax, entry.add_max);
    savePolicies(dataReduceMin, entry.reduce_min);
    savePolicies(dataRmMin, entry.rm_min);
  });

  const filterStateToConfig: Record<
    PolicyTypeFilter,
    Record<ReformStatus, [ColumnDefinition[], any[]]>
  > = {
    "any parking reform": {
      adopted: [ANY_REFORM_COLUMNS, dataAnyAdopted],
      proposed: [ANY_REFORM_COLUMNS, dataAnyProposed],
      repealed: [ANY_REFORM_COLUMNS, dataAnyRepealed],
    },
    "reduce parking minimums": {
      adopted: [SINGLE_POLICY_COLUMNS, dataReduceMin],
      proposed: [SINGLE_POLICY_COLUMNS, dataReduceMin],
      repealed: [SINGLE_POLICY_COLUMNS, dataReduceMin],
    },
    "remove parking minimums": {
      adopted: [SINGLE_POLICY_COLUMNS, dataRmMin],
      proposed: [SINGLE_POLICY_COLUMNS, dataRmMin],
      repealed: [SINGLE_POLICY_COLUMNS, dataRmMin],
    },
    "add parking maximums": {
      adopted: [SINGLE_POLICY_COLUMNS, dataAddMax],
      proposed: [SINGLE_POLICY_COLUMNS, dataAddMax],
      repealed: [SINGLE_POLICY_COLUMNS, dataAddMax],
    },
  };

  // We track what the filter is currently set to. When the filter changes,
  // we need to load the new columns and data.
  let currentPolicyTypeFilter = filterManager.getState().policyTypeFilter;
  let currentStatus = filterManager.getState().status;

  const [columns, data] =
    filterStateToConfig[currentPolicyTypeFilter][currentStatus];
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

  // We use Tabulator's filter to add/remove records based on FilterState,
  // as it's much faster than resetting the data.
  //
  // Note that the same filter works for every PolicyTypeFilter, meaning we
  // don't need to re-set this up based on which is chosen.
  let tableBuilt = false;
  table.on("tableBuilt", () => {
    tableBuilt = true;
    table.setFilter((row) => {
      const entry = filterManager.matchedPlaces[row.placeId];
      if (!entry) return false;
      if (entry.type === "any") {
        return true;
      }
      // With search, we ignore the normal filters like jurisdiction. However,
      // we do still have to pay attention to what dataset is loaded
      // (policy type x status).
      if (entry.type === "search") {
        // With 'any parking reform', each reform status has a different dataset already.
        // So, it's safe to include the entry from search.
        if (currentPolicyTypeFilter === "any parking reform") {
          return true;
        }
        return row.status === currentStatus;
      }
      return entry.matchingIndexes.includes(row.policyIdx);
    });
  });

  // Either re-filter the data or load an entirely new dataset.
  const updateData = (
    newPolicyTypeFilter: PolicyTypeFilter,
    newStatus: ReformStatus,
  ): void => {
    if (
      newPolicyTypeFilter === currentPolicyTypeFilter &&
      newStatus === currentStatus
    ) {
      table.refreshFilter();
    } else {
      currentPolicyTypeFilter = newPolicyTypeFilter;
      currentStatus = newStatus;
      const [columns2, data2] =
        filterStateToConfig[newPolicyTypeFilter][newStatus];
      table.setColumns(columns2);
      table.setData(data2);
    }
  };

  // When on map view, we should only lazily update the table the next time
  // we switch to table view.
  let dataRefreshQueued = false;
  filterManager.subscribe(
    "update table's records",
    ({ policyTypeFilter, status }) => {
      if (!tableBuilt) return;
      if (viewToggle.getValue() === "map") {
        dataRefreshQueued = true;
        return;
      }

      updateData(policyTypeFilter, status);
    },
  );

  viewToggle.subscribe((view) => {
    if (view === "map" || !dataRefreshQueued) return;
    dataRefreshQueued = false;
    const state = filterManager.getState();
    updateData(state.policyTypeFilter, state.status);
  }, "apply queued table data refresh");

  return table;
}
