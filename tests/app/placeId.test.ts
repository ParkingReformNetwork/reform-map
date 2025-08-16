import { expect, test } from "@playwright/test";

import {
  escapePlaceId,
  placeIdToUrl,
  determinePlaceId,
  determinesupplementalPlaceInfo,
  stripCountryFromPlaceId,
} from "../../src/js/model/placeId";

test("determinePlaceId", () => {
  expect(determinePlaceId({ name: "Tucson", state: "AZ" })).toEqual(
    "Tucson, AZ",
  );
  expect(determinePlaceId({ name: "Tucson", state: null })).toEqual("Tucson");
});

test("determinesupplementalPlaceInfo", () => {
  expect(
    determinesupplementalPlaceInfo({
      state: "Arizona",
      country: "United States",
      type: "city",
    }),
  ).toEqual("Arizona, United States");
  expect(
    determinesupplementalPlaceInfo({
      state: null,
      country: "United States",
      type: "city",
    }),
  ).toEqual("United States");
  expect(
    determinesupplementalPlaceInfo({
      state: null,
      country: "United States",
      type: "country",
    }),
  ).toBeNull();
});

test("stripCountryFromPlaceId", () => {
  expect(stripCountryFromPlaceId("Tucson")).toEqual("Tucson");
  expect(stripCountryFromPlaceId("Tucson, AZ")).toEqual("Tucson, AZ");
  expect(stripCountryFromPlaceId("Tucson, AZ, United States")).toEqual(
    "Tucson, AZ",
  );
  expect(
    stripCountryFromPlaceId("Tucson, AZ, United States, another string"),
  ).toEqual("Tucson, AZ");
});

test("escapePlaceID", () => {
  expect(escapePlaceId("Tucson, AZ")).toEqual("Tucson_AZ");
  expect(escapePlaceId("St. Lucia, AZ")).toEqual("St.Lucia_AZ");
  expect(escapePlaceId("St. Lucia, AZ, United States")).toEqual("St.Lucia_AZ");
});

test("placeIdToUrl", () => {
  expect(placeIdToUrl("Tucson, AZ")).toEqual(
    "https://parkingreform.org/mandates-map/city_detail/Tucson_AZ.html",
  );
});
