import {
  type CellComponent,
  type ColumnComponent,
  type ColumnDefinition,
  DownloadModule,
  ExportModule,
  FilterModule,
  FormatModule,
  FrozenColumnsModule,
  MoveColumnsModule,
  PageModule,
  ResizeColumnsModule,
  type RowComponent,
  type SortDirection,
  SortModule,
  Tabulator,
} from "tabulator-tables";
import type { ViewStateObservable } from "./layout/viewToggle";
import { determineAllPolicyTypes } from "./model/data";
import type { ReformDate } from "./model/ReformDate";
import {
  ALL_REFORM_STATUS,
  type PlaceId,
  type ProcessedCoreBenefitDistrict,
  type ProcessedCoreEntry,
  type ProcessedCoreLandUsePolicy,
  type ReformStatus,
} from "./model/types";
import type {
  PlaceFilterManager,
  PlaceMatch,
  PolicyTypeFilter,
} from "./state/FilterState";

function formatBoolean(cell: CellComponent): string {
  const v = cell.getValue() as boolean;
  return v ? "✓" : "";
}

function formatDate(cell: CellComponent): string {
  const v = cell.getValue() as ReformDate | null;
  return v ? v.format() : "";
}

export function compareDates(
  a: ReformDate | undefined,
  b: ReformDate | undefined,
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
  return a.valueOf() - b.valueOf();
}

export function compareStringArrays(a: string[], b: string[]): number {
  return a.join(",").localeCompare(b.join(","));
}

export function formatStringArrays(cell: CellComponent): string {
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
  { title: "State", field: "state", width: 120 },
  { title: "Country", field: "country", width: 120 },
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

const DATE_COLUMN: ColumnDefinition = {
  title: "Date",
  field: "date",
  width: 110,
  formatter: formatDate,
  sorter: compareDates,
};

const BENEFIT_DISTRICT_COLUMNS: ColumnDefinition[] = [
  ...PLACE_COLUMNS,
  DATE_COLUMN,
];

const LAND_USE_COLUMNS: ColumnDefinition[] = [
  ...PLACE_COLUMNS,
  DATE_COLUMN,
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
  {
    title: "Benefit district",
    field: "benefitDistrict",
    width: 120,
    formatter: formatBoolean,
    hozAlign: "center",
  },
];

export function tableDownloadFileName(
  policyType: PolicyTypeFilter,
  status: ReformStatus,
): string {
  const policy = {
    "any parking reform": "overview",
    "add parking maximums": "maximums",
    "remove parking minimums": "remove-minimums",
    "reduce parking minimums": "reduce-minimums",
    "parking benefit district": "benefit-district",
  }[policyType];
  return `parking-reforms--${policy}--${status}.csv`;
}

export interface TableRow {
  placeId: PlaceId;
  place: string;
  state: string | null;
  country: string;
  placeType: string;
  population: string;
  url: string;
  // Present on "any parking reform" rows.
  reduceMin?: boolean;
  rmMin?: boolean;
  addMax?: boolean;
  benefitDistrict?: boolean;
  // Present on single-policy rows.
  policyIdx?: number;
  date?: ReformDate | undefined;
  status?: ReformStatus;
  landUse?: string[];
  scope?: string[];
}

export interface TableDatasets {
  // "any parking reform" needs a distinct dataset per ReformStatus because the
  // boolean column values change with the status. The single-policy datasets
  // can be shared across statuses because the filter (from FilterState) already
  // removes records that don't match the current status.
  any: Record<ReformStatus, TableRow[]>;
  reduceMin: TableRow[];
  rmMin: TableRow[];
  addMax: TableRow[];
  benefitDistrict: TableRow[];
}

/**
 * Flatten the core entries into the row datasets Tabulator renders.
 *
 * Note that `population` becomes a locale string (e.g. "48,100"), which is why
 * the Population column's number sorter is configured with a thousand separator.
 */
export function buildTableData(
  entries: Record<PlaceId, ProcessedCoreEntry>,
): TableDatasets {
  const any: Record<ReformStatus, TableRow[]> = {
    adopted: [],
    proposed: [],
    repealed: [],
  };
  const reduceMin: TableRow[] = [];
  const rmMin: TableRow[] = [];
  const addMax: TableRow[] = [];
  const benefitDistrict: TableRow[] = [];
  Object.entries(entries).forEach(([placeId, entry]) => {
    const common = {
      placeId,
      place: entry.place.name,
      state: entry.place.state,
      country: entry.place.country,
      placeType: entry.place.type,
      population: entry.place.pop.toLocaleString("en-us"),
      url: entry.place.url,
    };

    for (const status of ALL_REFORM_STATUS) {
      const types = determineAllPolicyTypes(entry, status);
      any[status].push({
        ...common,
        reduceMin: types.includes("reduce parking minimums"),
        rmMin: types.includes("remove parking minimums"),
        addMax: types.includes("add parking maximums"),
        benefitDistrict: types.includes("parking benefit district"),
      });
    }

    const saveLandUsePolicies = (
      collection: TableRow[],
      policies: ProcessedCoreLandUsePolicy[] | undefined,
    ): void =>
      policies?.forEach((policy, i) => {
        collection.push({
          ...common,
          policyIdx: i,
          date: policy.date,
          status: policy.status,
          landUse: policy.land,
          scope: policy.scope,
        });
      });

    const saveParkingBenefit = (
      collection: TableRow[],
      policies: ProcessedCoreBenefitDistrict[] | undefined,
    ): void =>
      policies?.forEach((policy, i) => {
        collection.push({
          ...common,
          policyIdx: i,
          date: policy.date,
          status: policy.status,
        });
      });

    saveLandUsePolicies(addMax, entry.add_max);
    saveLandUsePolicies(reduceMin, entry.reduce_min);
    saveLandUsePolicies(rmMin, entry.rm_min);
    saveParkingBenefit(benefitDistrict, entry.benefit_district);
  });
  return { any, reduceMin, rmMin, addMax, benefitDistrict };
}

/**
 * Decide whether a table row is visible, given the app's computed
 * `matchedPlaces` and the currently loaded dataset (policy type x status).
 *
 * This bridges FilterState's per-place match to Tabulator's per-row filter.
 * Search ignores the normal filters but still respects the loaded dataset.
 */
export function rowMatchesFilter(
  row: Pick<TableRow, "placeId" | "status" | "policyIdx">,
  matchedPlaces: Record<PlaceId, PlaceMatch>,
  policyTypeFilter: PolicyTypeFilter,
  status: ReformStatus,
): boolean {
  const entry = matchedPlaces[row.placeId];
  if (!entry) return false;
  if (entry.type === "any") {
    return true;
  }
  if (entry.type === "search") {
    // With 'any parking reform', each reform status has a different dataset
    // already, so it's safe to include the entry from search.
    if (policyTypeFilter === "any parking reform") {
      return true;
    }
    return row.status === status;
  }
  return (
    row.policyIdx !== undefined && entry.matchingIndexes.includes(row.policyIdx)
  );
}

/**
 * Wire up the download button once. The policy type/status it downloads are
 * read from `getDownloadTarget` at click-time.
 */
function initCounterDownload(
  table: Tabulator,
  getDownloadTarget: () => [PolicyTypeFilter, ReformStatus],
): void {
  const container = document.getElementById("table-counter");
  if (!container) return;
  container.addEventListener("click", (event) => {
    if (
      !(event.target instanceof Element) ||
      !event.target.matches(".counter-table-download")
    )
      return;
    const [policyType, status] = getDownloadTarget();
    table.download("csv", tableDownloadFileName(policyType, status));
  });
}

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
    ExportModule,
    DownloadModule,
  ]);

  const datasets = buildTableData(filterManager.entries);

  const sameForAllStatuses = (
    tuple: [ColumnDefinition[], TableRow[]],
  ): Record<ReformStatus, [ColumnDefinition[], TableRow[]]> =>
    Object.fromEntries(
      ALL_REFORM_STATUS.map((status) => [status, tuple]),
    ) as Record<ReformStatus, [ColumnDefinition[], TableRow[]]>;

  const filterStateToConfig: Record<
    PolicyTypeFilter,
    Record<ReformStatus, [ColumnDefinition[], TableRow[]]>
  > = {
    "any parking reform": {
      adopted: [ANY_REFORM_COLUMNS, datasets.any.adopted],
      proposed: [ANY_REFORM_COLUMNS, datasets.any.proposed],
      repealed: [ANY_REFORM_COLUMNS, datasets.any.repealed],
    },
    "reduce parking minimums": sameForAllStatuses([
      LAND_USE_COLUMNS,
      datasets.reduceMin,
    ]),
    "remove parking minimums": sameForAllStatuses([
      LAND_USE_COLUMNS,
      datasets.rmMin,
    ]),
    "add parking maximums": sameForAllStatuses([
      LAND_USE_COLUMNS,
      datasets.addMax,
    ]),
    "parking benefit district": sameForAllStatuses([
      BENEFIT_DISTRICT_COLUMNS,
      datasets.benefitDistrict,
    ]),
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
    table.setFilter((row) =>
      rowMatchesFilter(
        row,
        filterManager.matchedPlaces,
        currentPolicyTypeFilter,
        currentStatus,
      ),
    );
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
      const [nextColumns, nextData] =
        filterStateToConfig[newPolicyTypeFilter][newStatus];
      table.setColumns(nextColumns);
      void table.setData(nextData);
    }
  };

  // When on map view, we should only lazily update the table the next time
  // we switch to table view.
  let dataRefreshQueued = false;

  // Track the latest policy type and status for the download button.
  let downloadPolicyType = currentPolicyTypeFilter;
  let downloadStatus = currentStatus;
  initCounterDownload(table, () => [downloadPolicyType, downloadStatus]);

  filterManager.subscribe(
    "update table's records",
    ({ policyTypeFilter, status }) => {
      downloadPolicyType = policyTypeFilter;
      downloadStatus = status;
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
