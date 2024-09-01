import { expect, test } from "@playwright/test";
import { mapPageToCitationLinks } from "../../scripts/brokenLinks";

test("mapPageToCitationLinks correctly determines some example pages", async () => {
  // If the links get updated, then update the below tests.
  const result = await mapPageToCitationLinks();
  expect(result["Abilene_KS.html"]).toEqual([
    "http://abileneks.citycode.net/index.html#!artiOffStreParkLoadAndUnloRegu",
  ]);
  expect(result["Albion_NE.html"]).toEqual([
    "https://albionnebraska.wpengine.com/wp-content/uploads/2021/01/CHAPTER-9-ZONING-REGULATIONS.pdf",
  ]);
  expect(result["Petaluma_CA.html"]).toEqual([
    "https://petaluma.municipal.codes/SmartCode/6.10.030",
    "https://petaluma.municipal.codes/ZoningOrds/11.035",
  ]);
});
