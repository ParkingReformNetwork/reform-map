import { expect, test } from "@playwright/test";

import { placeNameVariants } from "../../scripts/lib/geocoder";

test("placeNameVariants strips Canadian rural municipality suffix", () => {
  expect(placeNameVariants("Shellbrook No. 493 Rural Municipality")).toEqual([
    "Shellbrook No. 493 Rural Municipality",
    "Shellbrook No. 493",
  ]);
  expect(placeNameVariants("WestLake-Gladstone Rural Municipality")).toEqual([
    "WestLake-Gladstone Rural Municipality",
    "WestLake-Gladstone",
  ]);
});

test("placeNameVariants leaves other names alone", () => {
  expect(placeNameVariants("New Castle County")).toEqual(["New Castle County"]);
  expect(placeNameVariants("Lyons")).toEqual(["Lyons"]);
});
