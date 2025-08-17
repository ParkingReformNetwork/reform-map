import { expect, test } from "@playwright/test";

import {
  determineIsPrimary,
  radiusGivenZoom,
} from "../../src/js/map-features/markerUtils";
import { ProcessedPlace } from "../../src/js/model/types";

test("determineIsPrimary", () => {
  const place: ProcessedPlace = {
    name: "",
    state: "",
    country: "",
    type: "city",
    encoded: "",
    pop: 0,
    repeal: false,
    coord: [0, 0],
    url: "",
  };

  expect(determineIsPrimary({ place })).toEqual(false);

  // Repealed places are always primary.
  expect(determineIsPrimary({ place: { ...place, repeal: true } })).toEqual(
    true,
  );

  // An adopted parking benefit district makes somewhere primary.
  expect(
    determineIsPrimary({
      place,
      benefit_district: [{ status: "adopted", date: undefined }],
    }),
  ).toEqual(true);
  expect(
    determineIsPrimary({
      place,
      benefit_district: [{ status: "repealed", date: undefined }],
    }),
  ).toEqual(false);
});

test.describe("radiusGivenZoom", () => {
  test("calculates radius correctly for zoom levels", () => {
    expect(radiusGivenZoom({ zoom: 3, isPrimary: false })).toBe(5);
    expect(radiusGivenZoom({ zoom: 7, isPrimary: false })).toBe(14);
    expect(radiusGivenZoom({ zoom: 10, isPrimary: false })).toBe(21);
  });

  test("adds 2 for primary dots", () => {
    expect(radiusGivenZoom({ zoom: 7, isPrimary: true })).toBe(16);
    expect(radiusGivenZoom({ zoom: 7, isPrimary: false })).toBe(14);
  });
});
