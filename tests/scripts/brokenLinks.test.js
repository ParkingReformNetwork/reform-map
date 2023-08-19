import { expect, test } from "@playwright/test";
import { parseCitationLinks } from "../../scripts/brokenLinks";

test("parseCitationLinks correctly extracts some example pages", async () => {
  // If the links get updated, then update the below tests.

  const abilene = await parseCitationLinks("city_detail/Abilene_KS.html");
  expect(abilene).toEqual([
    "http://abileneks.citycode.net/index.html#!artiOffStreParkLoadAndUnloRegu",
  ]);
  const albion = await parseCitationLinks("city_detail/Albion_NE.html");
  expect(albion).toEqual([
    "https://albionnebraska.wpengine.com/wp-content/uploads/2021/01/CHAPTER-9-ZONING-REGULATIONS.pdf",
  ]);
  const petaluma = await parseCitationLinks("city_detail/Petaluma_CA.html");
  expect(petaluma).toEqual([
    "https://petaluma.municipal.codes/SmartCode/6.10.030",
    "https://petaluma.municipal.codes/ZoningOrds/11.035",
  ]);
});
