import { expect, test } from "@playwright/test";

import {
  FilterState,
  PlaceFilterManager,
} from "../../src/js/state/FilterState";
import { POPULATION_MAX_INDEX } from "../../src/js/filter-features/populationSlider";
import { PlaceId, ProcessedCoreEntry, Date } from "../../src/js/model/types";

test.describe("PlaceFilterManager.matchedPolicyRecords()", () => {
  function defaultState(): FilterState {
    return {
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
      status: new Set(["adopted"]),
      country: new Set(["United States", "Brazil"]),
      placeType: new Set(["city", "county"]),
      year: new Set(["2023", "2024"]),
      populationSliderIndexes: [0, POPULATION_MAX_INDEX],
    };
  }

  function defaultEntries(): Record<PlaceId, ProcessedCoreEntry> {
    return {
      "Place 1": {
        place: {
          name: "Place 1",
          state: "",
          country: "United States",
          type: "city",
          pop: 48100,
          repeal: false,
          coord: [0, 0],
          url: "",
        },
        reduce_min: [
          {
            status: "adopted",
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
          type: "county",
          pop: 400,
          repeal: true,
          coord: [0, 0],
          url: "",
        },
        add_max: [
          {
            status: "adopted",
            scope: ["city center / business district"],
            land: ["commercial"],
            date: new Date("2023"),
          },
          {
            status: "adopted",
            scope: ["citywide"],
            land: ["other"],
            date: new Date("2023"),
          },
        ],
        rm_min: [
          {
            status: "adopted",
            scope: ["citywide"],
            land: ["all uses"],
            date: new Date("2023"),
          },
        ],
      },
    };
  }

  test("any parking reform", () => {
    const expectedPlace1Match = {
      type: "any",
      hasAddMax: false,
      hasRmMin: false,
      hasReduceMin: true,
    };
    const expectedPlace2Match = {
      type: "any",
      hasAddMax: true,
      hasRmMin: true,
      hasReduceMin: false,
    };

    const manager = new PlaceFilterManager(defaultEntries(), defaultState());
    expect(manager.matchedPlaces).toEqual({
      "Place 1": expectedPlace1Match,
      "Place 2": expectedPlace2Match,
    });

    // The below filters should have no impact.
    manager.update({
      scope: new Set(),
      landUse: new Set(),
      status: new Set(),
      year: new Set(),
    });
    expect(manager.matchedPlaces).toEqual({
      "Place 1": expectedPlace1Match,
      "Place 2": expectedPlace2Match,
    });

    manager.update({ allMinimumsRemovedToggle: true });
    expect(manager.matchedPlaces).toEqual({
      "Place 2": expectedPlace2Match,
    });
    manager.update({
      allMinimumsRemovedToggle: defaultState().allMinimumsRemovedToggle,
    });

    manager.update({
      includedPolicyChanges: new Set(["reduce parking minimums"]),
    });
    expect(manager.matchedPlaces).toEqual({
      "Place 1": expectedPlace1Match,
    });
    manager.update({
      includedPolicyChanges: defaultState().includedPolicyChanges,
    });

    manager.update({ country: new Set(["United States"]) });
    expect(manager.matchedPlaces).toEqual({
      "Place 1": expectedPlace1Match,
    });
    manager.update({ country: defaultState().country });

    manager.update({ populationSliderIndexes: [0, 1] });
    expect(manager.matchedPlaces).toEqual({
      "Place 2": expectedPlace2Match,
    });
    manager.update({
      populationSliderIndexes: defaultState().populationSliderIndexes,
    });

    manager.update({ placeType: new Set(["county"]) });
    expect(manager.matchedPlaces).toEqual({
      "Place 2": expectedPlace2Match,
    });
    manager.update({
      placeType: defaultState().placeType,
    });
  });

  test("reduce minimums", () => {
    const manager = new PlaceFilterManager(defaultEntries(), {
      ...defaultState(),
      policyTypeFilter: "reduce parking minimums",
      // This option should be ignored with 'reduce parking minimums'.
      allMinimumsRemovedToggle: true,
      // Should be ignored.
      includedPolicyChanges: new Set(),
    });
    expect(manager.matchedPlaces).toEqual({
      "Place 1": {
        type: "single policy",
        policyType: "reduce parking minimums",
        matchingIndexes: [0],
      },
    });

    manager.update({ scope: new Set(["city center / business district"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ scope: defaultState().scope });

    manager.update({ landUse: new Set(["commercial"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ landUse: defaultState().landUse });

    manager.update({ status: new Set(["repealed"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ status: defaultState().status });

    manager.update({ year: new Set(["2023"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ year: defaultState().year });
  });

  test("add maximums", () => {
    const manager = new PlaceFilterManager(defaultEntries(), {
      ...defaultState(),
      policyTypeFilter: "add parking maximums",
      // Should be ignored.
      includedPolicyChanges: new Set(),
    });
    expect(manager.matchedPlaces).toEqual({
      "Place 2": {
        type: "single policy",
        policyType: "add parking maximums",
        matchingIndexes: [0, 1],
      },
    });

    manager.update({ scope: new Set(["city center / business district"]) });
    expect(manager.matchedPlaces).toEqual({
      "Place 2": {
        type: "single policy",
        policyType: "add parking maximums",
        matchingIndexes: [0],
      },
    });
    manager.update({ scope: defaultState().scope });

    manager.update({ landUse: new Set(["commercial"]) });
    expect(manager.matchedPlaces).toEqual({
      "Place 2": {
        type: "single policy",
        policyType: "add parking maximums",
        matchingIndexes: [0],
      },
    });
    manager.update({ landUse: defaultState().landUse });

    manager.update({ status: new Set(["repealed"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ status: defaultState().status });

    manager.update({ year: new Set(["2024"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ year: defaultState().year });

    const noRepealsEntries = defaultEntries();
    noRepealsEntries["Place 2"].place.repeal = false;
    const manager2 = new PlaceFilterManager(noRepealsEntries, {
      ...defaultState(),
      policyTypeFilter: "add parking maximums",
      allMinimumsRemovedToggle: true,
    });
    expect(manager2.matchedPlaces).toEqual({});
  });

  test("remove minimums", () => {
    const manager = new PlaceFilterManager(defaultEntries(), {
      ...defaultState(),
      policyTypeFilter: "remove parking minimums",
      // Should be ignored.
      includedPolicyChanges: new Set(),
    });
    const expectedMatch = {
      "Place 2": {
        type: "single policy",
        policyType: "remove parking minimums",
        matchingIndexes: [0],
      },
    };

    expect(manager.matchedPlaces).toEqual(expectedMatch);

    // `scope` only applies if allMinimumsRemovedToggle is false.
    manager.update({ scope: new Set(["city center / business district"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ allMinimumsRemovedToggle: true });
    expect(manager.matchedPlaces).toEqual(expectedMatch);
    manager.update({
      scope: defaultState().scope,
      allMinimumsRemovedToggle: false,
    });

    // `landUse` only applies if allMinimumsRemovedToggle is false.
    manager.update({ landUse: new Set(["commercial"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ allMinimumsRemovedToggle: true });
    expect(manager.matchedPlaces).toEqual(expectedMatch);
    manager.update({
      landUse: defaultState().landUse,
      allMinimumsRemovedToggle: false,
    });

    manager.update({ status: new Set(["repealed"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ status: defaultState().status });

    manager.update({ year: new Set(["2024"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ year: defaultState().year });

    const noRepealsEntries = defaultEntries();
    noRepealsEntries["Place 2"].place.repeal = false;
    const manager2 = new PlaceFilterManager(noRepealsEntries, {
      ...defaultState(),
      policyTypeFilter: "remove parking minimums",
      allMinimumsRemovedToggle: true,
    });
    expect(manager2.matchedPlaces).toEqual({});
  });

  test("search", () => {
    // Start with a state that does not match anything to prove that search overrides filters.
    const manager = new PlaceFilterManager(defaultEntries(), {
      ...defaultState(),
      country: new Set(),
    });
    expect(manager.matchedPlaces).toEqual({});

    manager.update({ searchInput: "Place 1" });
    expect(manager.matchedPlaces).toEqual({
      "Place 1": { type: "search" },
    });

    // Unrecognized search should match nothing (although, the UI should prevent this from happening anyways).
    manager.update({ searchInput: "Unknown" });
    expect(manager.matchedPlaces).toEqual({});
  });
});
