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

import { PlaceFilterManager, PolicyTypeFilter } from "./FilterState";
import { Date, ProcessedCorePolicy } from "./types";
import { ViewStateObservable } from "./viewToggle";
import { determinePolicyTypes } from "./data";

function formatBoolean(cell: CellComponent): string {
  const v = cell.getValue() as boolean;
  return v ? "✓" : "";
}

function formatDate(cell: CellComponent): string {
  const v = cell.getValue() as Date | null;
  return v ? v.format() : "";
}

function compareDates(a: Date | null, b: Date | null): number {
  if (!a) return 1;
  if (!b) return -1;
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
      // @ts-ignore
      thousandSeparator: ",",
    },
    width: 90,
  },
];

const POLICY_COLUMNS: ColumnDefinition[] = [
  {
    title: "Reform date",
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
  {
    title: "Status",
    field: "status",
    width: 120,
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

const LEGACY_COLUMNS: ColumnDefinition[] = [
  ...PLACE_COLUMNS,
  {
    title: "Policy change",
    field: "policyChange",
    width: 260,
    formatter: formatStringArrays,
    sorter: compareStringArrays,
  },
  ...POLICY_COLUMNS,
];

export default function initTable(
  filterManager: PlaceFilterManager,
  viewToggle: ViewStateObservable,
  options: { revampEnabled: boolean },
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

  const dataLegacy: any[] = [];
  const dataAnyReform: any[] = [];
  const dataReduceMin: any[] = [];
  const dataRmMin: any[] = [];
  const dataAddMax: any[] = [];
  Object.entries(filterManager.entries).forEach(([placeId, entry]) => {
    const common = {
      placeId: placeId,
      place: entry.place.name,
      state: entry.place.state,
      country: entry.place.country,
      placeType: entry.place.type,
      population: entry.place.pop.toLocaleString("en-us"),
      url: entry.place.url,
    };
    dataLegacy.push({
      ...common,
      date: entry.unifiedPolicy.date,
      status: entry.unifiedPolicy.status,
      landUse: entry.unifiedPolicy.land,
      policyChange: entry.unifiedPolicy.policy,
      scope: entry.unifiedPolicy.scope,
    });

    if (!options.revampEnabled) return;

    const policyTypes = determinePolicyTypes(entry, { onlyPassed: true });
    dataAnyReform.push({
      ...common,
      reduceMin: policyTypes.includes("reduce parking minimums"),
      rmMin: policyTypes.includes("remove parking minimums"),
      addMax: policyTypes.includes("add parking maximums"),
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

  const policyTypeFilterToConfig: Record<
    PolicyTypeFilter,
    [ColumnDefinition[], any[]]
  > = {
    "legacy reform": [LEGACY_COLUMNS, dataLegacy],
    "any parking reform": [ANY_REFORM_COLUMNS, dataAnyReform],
    "reduce parking minimums": [SINGLE_POLICY_COLUMNS, dataReduceMin],
    "remove parking minimums": [SINGLE_POLICY_COLUMNS, dataRmMin],
    "add parking maximums": [SINGLE_POLICY_COLUMNS, dataAddMax],
  };

  // We track what the table's policy type filter is currently set to. When the policy
  // type filter changes, we need to load the new columns and data.
  let currentPolicyTypeFilter = filterManager.getState().policyTypeFilter;

  const [columns, data] = policyTypeFilterToConfig[currentPolicyTypeFilter];
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
      if (
        entry.type === "legacy" ||
        entry.type === "any" ||
        entry.type === "search"
      ) {
        return true;
      }
      return entry.matchingIndexes.includes(row.policyIdx);
    });
  });

  // Either re-filter the data or load an entirely new dataset.
  const updateData = (newPolicyTypeFilter: PolicyTypeFilter): void => {
    if (newPolicyTypeFilter === currentPolicyTypeFilter) {
      table.refreshFilter();
    } else {
      currentPolicyTypeFilter = newPolicyTypeFilter;
      const [columns, data] = policyTypeFilterToConfig[newPolicyTypeFilter];
      table.setColumns(columns);
      table.setData(data);
    }
  };

  // When on map view, we should only lazily update the table the next time
  // we switch to table view.
  let dataRefreshQueued = false;
  filterManager.subscribe("update table's records", ({ policyTypeFilter }) => {
    if (!tableBuilt) return;
    if (viewToggle.getValue() === "map") {
      dataRefreshQueued = true;
      return;
    }

    updateData(policyTypeFilter);
  });

  viewToggle.subscribe((view) => {
    if (view === "map" || !dataRefreshQueued) return;
    dataRefreshQueued = false;
    updateData(filterManager.getState().policyTypeFilter);
  }, "apply queued table data refresh");

  return table;
}
