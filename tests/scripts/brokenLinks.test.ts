import { expect, test } from "@playwright/test";
import { mapPlaceToCitationLinks } from "../../scripts/brokenLinks";

test("mapPlaceToCitationLinks correctly determines some example pages", async () => {
  // If the links get updated, then update the below tests.
  const result = await mapPlaceToCitationLinks();
  expect(result["Abilene, KS, United States"]).toEqual([
    "https://abileneks.citycode.net/index.html#!artiOffStreParkLoadAndUnloRegu",
  ]);
  expect(result["Albion, NE, United States"]).toEqual([
    "https://www.albionne.com/media/686",
  ]);
  expect(result["Petaluma, CA, United States"]).toEqual([
    "https://petaluma.municipal.codes/SmartCode/6.10.030",
    "https://petaluma.municipal.codes/ZoningOrds/11.035",
  ]);
});
