import {
  Tabulator,
  FilterModule,
  FormatModule,
  SortModule,
  ResizeColumnsModule,
  MoveColumnsModule,
  ExportModule,
  DownloadModule,
  ColumnDefinition,
  FrozenColumnsModule,
  PageModule,
  CellComponent,
  RowComponent,
  SortDirection,
  ColumnComponent,
} from "tabulator-tables";

import { PlaceFilterManager, PolicyTypeFilter } from "./state/FilterState";
import {
  Date,
  ProcessedCoreBenefitDistrict,
  ProcessedCoreLandUsePolicy,
  ReformStatus,
} from "./model/types";
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
  a: Date | undefined,
  b: Date | undefined,
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

function updateCounterDownload(
  table: Tabulator,
  policyType: PolicyTypeFilter,
  status: ReformStatus,
): void {
  const button = document.querySelector(".counter-table-download");
  if (!button) return;
  button.addEventListener("click", () =>
    table.download("csv", tableDownloadFileName(policyType, status)),
  );
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

  // For "any parking reform", we need distinct datasets for each ReformStatus because the
  // column values change. Whereas for the policy record datasets, we can use a
  // single dataset for all the statuses because the filter code (from FilterState)
  // will already filter out records that don't match the current status.
  const dataAnyAdopted: any[] = [];
  const dataAnyProposed: any[] = [];
  const dataAnyRepealed: any[] = [];
  const dataReduceMin: any[] = [];
  const dataRmMin: any[] = [];
  const dataAddMax: any[] = [];
  const dataBenefitDistrict: any[] = [];
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
      benefitDistrict: adopted.includes("parking benefit district"),
    });
    const proposed = determineAllPolicyTypes(entry, "proposed");
    dataAnyProposed.push({
      ...common,
      reduceMin: proposed.includes("reduce parking minimums"),
      rmMin: proposed.includes("remove parking minimums"),
      addMax: proposed.includes("add parking maximums"),
      benefitDistrict: proposed.includes("parking benefit district"),
    });
    const repealed = determineAllPolicyTypes(entry, "repealed");
    dataAnyRepealed.push({
      ...common,
      reduceMin: repealed.includes("reduce parking minimums"),
      rmMin: repealed.includes("remove parking minimums"),
      addMax: repealed.includes("add parking maximums"),
      benefitDistrict: repealed.includes("parking benefit district"),
    });

    const saveLandUsePolicies = (
      collection: any[],
      policies: ProcessedCoreLandUsePolicy[] | undefined,
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

    const saveParkingBenefit = (
      collection: any[],
      policies: ProcessedCoreBenefitDistrict[] | undefined,
    ): void =>
      policies?.forEach((policy, i) =>
        collection.push({
          ...common,
          policyIdx: i,
          date: policy.date,
          status: policy.status,
        }),
      );

    saveLandUsePolicies(dataAddMax, entry.add_max);
    saveLandUsePolicies(dataReduceMin, entry.reduce_min);
    saveLandUsePolicies(dataRmMin, entry.rm_min);
    saveParkingBenefit(dataBenefitDistrict, entry.benefit_district);
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
      adopted: [LAND_USE_COLUMNS, dataReduceMin],
      proposed: [LAND_USE_COLUMNS, dataReduceMin],
      repealed: [LAND_USE_COLUMNS, dataReduceMin],
    },
    "remove parking minimums": {
      adopted: [LAND_USE_COLUMNS, dataRmMin],
      proposed: [LAND_USE_COLUMNS, dataRmMin],
      repealed: [LAND_USE_COLUMNS, dataRmMin],
    },
    "add parking maximums": {
      adopted: [LAND_USE_COLUMNS, dataAddMax],
      proposed: [LAND_USE_COLUMNS, dataAddMax],
      repealed: [LAND_USE_COLUMNS, dataAddMax],
    },
    "parking benefit district": {
      adopted: [BENEFIT_DISTRICT_COLUMNS, dataBenefitDistrict],
      proposed: [BENEFIT_DISTRICT_COLUMNS, dataBenefitDistrict],
      repealed: [BENEFIT_DISTRICT_COLUMNS, dataBenefitDistrict],
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
      updateCounterDownload(table, policyTypeFilter, status);
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
