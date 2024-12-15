import { expect, test } from "@playwright/test";

import { FilterState, PlaceFilterManager } from "../../src/js/FilterState";
import { POPULATION_MAX_INDEX } from "../../src/js/populationSlider";
import { PlaceId, ProcessedCoreEntry, Date } from "../../src/js/types";

test.describe("PlaceFilterManager.matchedPolicyRecords()", () => {
  const DEFAULT_STATE: FilterState = {
    searchInput: null,
    policyTypeFilter: "any parking reform",
    allMinimumsRemovedToggle: false,
    includedPolicyChanges: new Set([
      "add parking maximums",
      "reduce parking minimums",
      "remove parking minimums",
    ]),
    scope: new Set(["citywide", "city center / business district"]),
    landUse: new Set(["all uses", "commercial", "other"]),
    status: new Set(["implemented", "passed"]),
    country: new Set(["United States", "Brazil"]),
    year: new Set(["2023", "2024"]),
    populationSliderIndexes: [0, POPULATION_MAX_INDEX],
  };

  const DEFAULT_ENTRIES: Record<PlaceId, ProcessedCoreEntry> = {
    "Place 1": {
      place: {
        name: "Place 1",
        state: "",
        country: "United States",
        pop: 48100,
        repeal: false,
        coord: [0, 0],
        url: "",
      },
      unifiedPolicy: {
        summary: "",
        policy: ["reduce parking minimums"],
        status: "implemented",
        scope: ["citywide"],
        land: ["all uses"],
        date: new Date("2024"),
      },
      reduce_min: [
        {
          summary: "",
          status: "implemented",
          scope: ["citywide"],
          land: ["all uses"],
          date: new Date("2024"),
        },
      ],
    },
    "Place 2": {
      place: {
        name: "Place 2",
        state: "",
        country: "Brazil",
        pop: 400,
        repeal: true,
        coord: [0, 0],
        url: "",
      },
      unifiedPolicy: {
        summary: "",
        policy: ["add parking maximums", "remove parking minimums"],
        status: "implemented",
        scope: ["citywide", "city center / business district"],
        land: ["all uses", "commercial"],
        date: new Date("2023"),
      },
      add_max: [
        {
          summary: "",
          status: "implemented",
          scope: ["city center / business district"],
          land: ["commercial"],
          date: new Date("2023"),
        },
        {
          summary: "",
          status: "implemented",
          scope: ["citywide"],
          land: ["other"],
          date: new Date("2023"),
        },
      ],
      rm_min: [
        {
          summary: "",
          status: "passed",
          scope: ["citywide"],
          land: ["all uses"],
          date: new Date("2023"),
        },
      ],
    },
  };

  test("any parking reform", () => {
    const manager = new PlaceFilterManager(DEFAULT_ENTRIES, DEFAULT_STATE);
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 1": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [] },
      "Place 2": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [] },
    });

    // The below filters should have no impact.
    manager.update({
      scope: new Set(),
      landUse: new Set(),
      status: new Set(),
      year: new Set(),
    });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 1": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [] },
      "Place 2": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [] },
    });

    manager.update({ allMinimumsRemovedToggle: true });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 2": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [] },
    });
    manager.update({
      allMinimumsRemovedToggle: DEFAULT_STATE.allMinimumsRemovedToggle,
    });

    manager.update({
      includedPolicyChanges: new Set(["reduce parking minimums"]),
    });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 1": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [] },
    });
    manager.update({
      includedPolicyChanges: DEFAULT_STATE.includedPolicyChanges,
    });

    manager.update({ country: new Set(["United States"]) });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 1": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [] },
    });
    manager.update({ country: DEFAULT_STATE.country });

    manager.update({ populationSliderIndexes: [0, 1] });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 2": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [] },
    });
    manager.update({
      populationSliderIndexes: DEFAULT_STATE.populationSliderIndexes,
    });
  });

  test("reduce minimums", () => {
    const manager = new PlaceFilterManager(DEFAULT_ENTRIES, {
      ...DEFAULT_STATE,
      policyTypeFilter: "reduce parking minimums",
      // This option should be ignored with 'reduce parking minimums'.
      allMinimumsRemovedToggle: true,
      // Should be ignored.
      includedPolicyChanges: new Set(),
    });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 1": { rmMinIdx: [], reduceMinIdx: [0], addMaxIdx: [] },
    });

    manager.update({ scope: new Set(["city center / business district"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ scope: DEFAULT_STATE.scope });

    manager.update({ landUse: new Set(["commercial"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ landUse: DEFAULT_STATE.landUse });

    manager.update({ status: new Set(["repealed"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ status: DEFAULT_STATE.status });

    manager.update({ year: new Set(["2023"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ year: DEFAULT_STATE.year });
  });

  test("add maximums", () => {
    const manager = new PlaceFilterManager(DEFAULT_ENTRIES, {
      ...DEFAULT_STATE,
      policyTypeFilter: "add parking maximums",
      // Should be ignored.
      includedPolicyChanges: new Set(),
    });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 2": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [0, 1] },
    });

    manager.update({ scope: new Set(["city center / business district"]) });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 2": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [0] },
    });
    manager.update({ scope: DEFAULT_STATE.scope });

    manager.update({ landUse: new Set(["commercial"]) });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 2": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [0] },
    });
    manager.update({ landUse: DEFAULT_STATE.landUse });

    manager.update({ status: new Set(["repealed"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ status: DEFAULT_STATE.status });

    manager.update({ year: new Set(["2024"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ year: DEFAULT_STATE.year });

    const noRepealsEntries = { ...DEFAULT_ENTRIES };
    noRepealsEntries["Place 2"].place.repeal = false;
    const manager2 = new PlaceFilterManager(noRepealsEntries, {
      ...DEFAULT_STATE,
      policyTypeFilter: "add parking maximums",
      allMinimumsRemovedToggle: true,
    });
    expect(manager2.matchedPolicyRecords).toEqual({});
  });

  test("remove minimums", () => {
    const manager = new PlaceFilterManager(DEFAULT_ENTRIES, {
      ...DEFAULT_STATE,
      policyTypeFilter: "remove parking minimums",
      // Should be ignored.
      includedPolicyChanges: new Set(),
    });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 2": { rmMinIdx: [0], reduceMinIdx: [], addMaxIdx: [] },
    });

    manager.update({ scope: new Set(["city center / business district"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ scope: DEFAULT_STATE.scope });

    manager.update({ landUse: new Set(["commercial"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ landUse: DEFAULT_STATE.landUse });

    manager.update({ status: new Set(["repealed"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ status: DEFAULT_STATE.status });

    manager.update({ year: new Set(["2024"]) });
    expect(manager.matchedPolicyRecords).toEqual({});
    manager.update({ year: DEFAULT_STATE.year });

    const noRepealsEntries = { ...DEFAULT_ENTRIES };
    noRepealsEntries["Place 2"].place.repeal = false;
    const manager2 = new PlaceFilterManager(noRepealsEntries, {
      ...DEFAULT_STATE,
      policyTypeFilter: "add parking maximums",
      allMinimumsRemovedToggle: true,
    });
    expect(manager2.matchedPolicyRecords).toEqual({});
  });

  test("search", () => {
    // Start with a state that does not match anything to prove that search overrides filters.
    const manager = new PlaceFilterManager(DEFAULT_ENTRIES, {
      ...DEFAULT_STATE,
      country: new Set(),
    });
    expect(manager.matchedPolicyRecords).toEqual({});

    manager.update({ searchInput: "Place 1" });
    expect(manager.matchedPolicyRecords).toEqual({
      "Place 1": { rmMinIdx: [], reduceMinIdx: [], addMaxIdx: [] },
    });

    // Unrecognized search should match nothing (although, the UI should prevent this from happening anyways).
    manager.update({ searchInput: "Unknown" });
    expect(manager.matchedPolicyRecords).toEqual({});
  });
});
