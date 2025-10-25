import { expect, test } from "@playwright/test";
import { mapPlaceToCitationLinks } from "../../scripts/brokenLinks";

test("mapPlaceToCitationLinks correctly determines some example pages", async () => {
  // If the links get updated, then update the below tests.
  const rawResult = await mapPlaceToCitationLinks();
  const result = Object.fromEntries(rawResult);
  expect(result["Abilene, Kansas, United States"]).toEqual([
    "https://abileneks.citycode.net/index.html#!artiOffStreParkLoadAndUnloRegu",
  ]);
  expect(result["Albion, Nebraska, United States"]).toEqual([
    "https://www.albionne.com/media/686",
  ]);
  expect(result["Petaluma, California, United States"]).toEqual([
    "https://petaluma.municipal.codes/SmartCode/6.10.030",
    "https://petaluma.municipal.codes/ZoningOrds/11.035",
  ]);
});
