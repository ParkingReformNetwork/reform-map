const { expect, test } = require("@jest/globals");
const { parseCityNameAndLinks } = require("../brokenLinks");

test("parseLinks correctly extracts some example pages", async () => {
  // If the links get updated, then update the below tests.

  const abilene = await parseCityNameAndLinks("city_detail/Abilene_KS.html");
  expect(abilene).toEqual([
    "Abilene, KS",
    [
      "http://abileneks.citycode.net/index.html#!artiOffStreParkLoadAndUnloRegu",
    ],
  ]);
  const albion = await parseCityNameAndLinks("city_detail/Albion_NE.html");
  expect(albion).toEqual([
    "Albion, NE",
    [
      "https://albionnebraska.wpengine.com/wp-content/uploads/2021/01/CHAPTER-9-ZONING-REGULATIONS.pdf",
    ],
  ]);
  const petaluma = await parseCityNameAndLinks("city_detail/Petaluma_CA.html");
  expect(petaluma).toEqual([
    "Petaluma, CA",
    [
      "https://petaluma.municipal.codes/SmartCode/6.10.030",
      "https://petaluma.municipal.codes/ZoningOrds/11.035",
    ],
  ]);
});
