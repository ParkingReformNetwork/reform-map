import { expect, test } from "@playwright/test";
import { loadMap, getNumCities } from "./utils";

test("scope filter updates markers", async ({ page }) => {
  await loadMap(page);

  // min updated on 9/3/23
  const scopeMin = {
    Regional: 5,
    Citywide: 257,
    "City Center": 1430,
    "Transit Oriented": 18,
    "Main Street": 33,
  };

  const checkScope = async (scopeType) => {
    await page.selectOption(".filter--scope", scopeType);

    const min = Array.isArray(scopeType)
      ? scopeType.reduce((sum, key) => sum + (scopeMin[key] || 0), 0)
      : scopeMin[scopeType] || 0;
    const cities = await getNumCities(page);

    return cities >= min && cities < min * 1.5;
  };

  expect(await checkScope("Regional")).toBe(true);
  expect(await checkScope("Citywide")).toBe(true);
  expect(await checkScope("City Center")).toBe(true);
  expect(await checkScope("Transit Oriented")).toBe(true);
  expect(await checkScope("Main Street")).toBe(true);
  expect(await checkScope(["Transit Oriented", "City Center"])).toBe(true);
});
