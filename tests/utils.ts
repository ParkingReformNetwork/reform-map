import type { TestInfo } from "@playwright/test";

import type { ProcessedCoreEntry, ProcessedPlace } from "../src/js/model/types";

/**
 * Normally, Playwright saves the operating system name in snapshot file
 * names. Our snapshots are OS-independent, so turn this off.
 */
export function useOsIndependentSnapshots(testInfo: TestInfo): void {
  testInfo.snapshotSuffix = "";
}

export function makePlace(
  overrides: Partial<ProcessedPlace> = {},
): ProcessedPlace {
  return {
    name: "Place",
    state: "",
    country: "United States",
    type: "city",
    encoded: "",
    pop: 48100,
    repeal: false,
    coord: [0, 0],
    url: "",
    ...overrides,
  };
}

export function makeEntry(
  overrides: Partial<ProcessedCoreEntry> = {},
): ProcessedCoreEntry {
  return {
    place: makePlace(),
    ...overrides,
  };
}
