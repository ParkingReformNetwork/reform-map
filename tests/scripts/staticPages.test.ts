import { expect, test } from "@playwright/test";

import { generateSEO } from "../../scripts/lib/staticPages";
import type {
  ProcessedCoreEntry,
  ReformStatus,
} from "../../src/js/model/types";

test.describe("generateSEO", () => {
  const PLACE_ID = "Tucson, Arizona, United States";
  const EXPECTED_TITLE = `Parking reforms in ${PLACE_ID} | Parking Reform Network`;
  const BASE_ENTRY: ProcessedCoreEntry = {
    place: {
      name: "Tucson",
      state: "",
      country: "",
      type: "city",
      coord: [0, 0],
      pop: 0,
      repeal: false,
      encoded: "",
      url: "",
    },
  };

  function addReforms(
    entry: ProcessedCoreEntry,
    status: ReformStatus,
  ): ProcessedCoreEntry {
    return {
      place: entry.place,
      add_max: [
        ...(entry.add_max ?? []),
        { status, land: [], scope: [], date: undefined },
      ],
      rm_min: [
        ...(entry.rm_min ?? []),
        { status, land: [], scope: [], date: undefined },
      ],
      reduce_min: [
        ...(entry.reduce_min ?? []),
        { status, land: [], scope: [], date: undefined },
      ],
      benefit_district: [
        ...(entry.benefit_district ?? []),
        { status, date: undefined },
      ],
    };
  }

  test("adopted reforms take precedence", () => {
    const entry = addReforms(
      addReforms(addReforms(BASE_ENTRY, "adopted"), "proposed"),
      "repealed",
    );
    const { title, description } = generateSEO(PLACE_ID, entry);
    expect(title).toEqual(EXPECTED_TITLE);
    expect(description).toEqual(
      "Tucson added parking maximums, reduced parking minimums, removed parking minimums, and created a parking benefit district. View zoning code and implementation details.",
    );
  });

  test("proposed reforms", () => {
    const entry = addReforms(addReforms(BASE_ENTRY, "proposed"), "repealed");
    const { title, description } = generateSEO(PLACE_ID, entry);
    expect(title).toEqual(EXPECTED_TITLE);
    expect(description).toEqual(
      "Tucson proposed adding parking maximums, reducing parking minimums, removing parking minimums, and creating a parking benefit district. View zoning code and implementation details.",
    );
  });

  test("repealed reforms", () => {
    const entry = addReforms(BASE_ENTRY, "repealed");
    const { title, description } = generateSEO(PLACE_ID, entry);
    expect(title).toEqual(EXPECTED_TITLE);
    expect(description).toEqual(
      "Tucson removed parking maximums, reversed parking minimum reductions, reinstated parking minimums, and removed their parking benefit district. View zoning code and implementation details.",
    );
  });
});
