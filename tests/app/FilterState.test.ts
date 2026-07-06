import { expect, test } from "@playwright/test";
import { ReformDate } from "../../src/js/model/ReformDate";
import type { PlaceId, ProcessedCoreEntry } from "../../src/js/model/types";
import {
  type FilterState,
  PlaceFilterManager,
} from "../../src/js/state/FilterState";
import { DEFAULT_FILTER_STATE } from "../../src/js/state/urlEncoder";
import { makeEntry, makePlace } from "./utils";

test.describe("PlaceFilterManager.matchedPlaces", () => {
  function defaultState(): FilterState {
    return {
      ...DEFAULT_FILTER_STATE,
      scope: new Set(["citywide", "city center / business district"]),
      landUse: new Set(["all uses", "commercial", "other"]),
      country: new Set(["United States", "Brazil"]),
      placeType: new Set(["city", "county"]),
      year: new Set(["1997", "2023", "2024"]),
    };
  }

  function defaultEntries(): Record<PlaceId, ProcessedCoreEntry> {
    return {
      "Place 1": makeEntry({
        place: makePlace({ name: "Place 1" }),
        reduce_min: [
          {
            status: "adopted",
            scope: ["citywide"],
            land: ["all uses"],
            date: new ReformDate("2024"),
          },
        ],
      }),
      "Place 2": makeEntry({
        place: makePlace({
          name: "Place 2",
          country: "Brazil",
          type: "county",
          pop: 400,
          repeal: true,
        }),
        add_max: [
          {
            status: "adopted",
            scope: ["city center / business district"],
            land: ["commercial"],
            date: new ReformDate("2023"),
          },
          {
            status: "proposed",
            scope: ["citywide"],
            land: ["other"],
            date: new ReformDate("2023"),
          },
        ],
        rm_min: [
          {
            status: "adopted",
            scope: ["citywide"],
            land: ["all uses"],
            date: new ReformDate("2023"),
          },
        ],
        benefit_district: [
          {
            status: "adopted",
            date: new ReformDate("1997"),
          },
        ],
      }),
    };
  }

  /** `defaultEntries()`, but with "Place 2"'s repeal unset. */
  function noRepealsEntries(): Record<PlaceId, ProcessedCoreEntry> {
    const entries = defaultEntries();
    entries["Place 2"].place.repeal = false;
    return entries;
  }

  test("any parking reform", () => {
    const expectedPlace1Match = {
      type: "any",
      policyTypes: ["reduce parking minimums"],
    };
    const expectedPlace2Match = {
      type: "any",
      policyTypes: [
        "add parking maximums",
        "remove parking minimums",
        "parking benefit district",
      ],
    };

    const manager = new PlaceFilterManager(defaultEntries(), defaultState());
    expect(manager.matchedPlaces).toEqual({
      "Place 1": expectedPlace1Match,
      "Place 2": expectedPlace2Match,
    });

    // The below filters should have no impact.
    manager.update({
      allMinimumsRemovedToggle: true,
      scope: new Set(),
      landUse: new Set(),
      year: new Set(),
    });
    expect(manager.matchedPlaces).toEqual({
      "Place 1": expectedPlace1Match,
      "Place 2": expectedPlace2Match,
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

    manager.update({ status: "proposed" });
    expect(manager.matchedPlaces).toEqual({
      "Place 2": {
        type: "any",
        policyTypes: ["add parking maximums"],
      },
    });
    manager.update({
      status: defaultState().status,
    });
  });

  test("reduce minimums", () => {
    const manager = new PlaceFilterManager(defaultEntries(), {
      ...defaultState(),
      policyTypeFilter: "reduce parking minimums",
      // Should be ignored.
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

    manager.update({ status: "repealed" });
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
        matchingIndexes: [0],
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

    manager.update({ status: "proposed" });
    expect(manager.matchedPlaces).toEqual({
      "Place 2": {
        type: "single policy",
        policyType: "add parking maximums",
        matchingIndexes: [1],
      },
    });
    manager.update({ status: defaultState().status });

    manager.update({ year: new Set(["2024"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ year: defaultState().year });

    // `allMinimumsRemovedToggle` should not matter.
    const manager2 = new PlaceFilterManager(noRepealsEntries(), {
      ...defaultState(),
      policyTypeFilter: "add parking maximums",
      allMinimumsRemovedToggle: true,
    });
    expect(manager2.matchedPlaces).toEqual({
      "Place 2": {
        type: "single policy",
        policyType: "add parking maximums",
        matchingIndexes: [0],
      },
    });
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

    manager.update({ status: "repealed" });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ status: defaultState().status });

    manager.update({ year: new Set(["2024"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ year: defaultState().year });

    const manager2 = new PlaceFilterManager(noRepealsEntries(), {
      ...defaultState(),
      policyTypeFilter: "remove parking minimums",
      allMinimumsRemovedToggle: true,
    });
    expect(manager2.matchedPlaces).toEqual({});
  });

  test("benefit district", () => {
    const manager = new PlaceFilterManager(defaultEntries(), {
      ...defaultState(),
      policyTypeFilter: "parking benefit district",
      // Should be ignored.
      includedPolicyChanges: new Set(),
      scope: new Set(),
      landUse: new Set(),
    });
    expect(manager.matchedPlaces).toEqual({
      "Place 2": {
        type: "single policy",
        policyType: "parking benefit district",
        matchingIndexes: [0],
      },
    });

    manager.update({ status: "proposed" });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ status: defaultState().status });

    manager.update({ year: new Set(["2024"]) });
    expect(manager.matchedPlaces).toEqual({});
    manager.update({ year: defaultState().year });

    // `allMinimumsRemovedToggle` should not matter.
    const manager2 = new PlaceFilterManager(noRepealsEntries(), {
      ...defaultState(),
      policyTypeFilter: "parking benefit district",
      allMinimumsRemovedToggle: true,
    });
    expect(manager2.matchedPlaces).toEqual({
      "Place 2": {
        type: "single policy",
        policyType: "parking benefit district",
        matchingIndexes: [0],
      },
    });
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
