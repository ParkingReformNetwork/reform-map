import { expect, test } from "@playwright/test";
import { loadMap, getNumCities } from "./utils";

test("scope filter updates markers", async ({ page }) => {
  await loadMap(page);

  // min updated on 9/3/23
  const scopeMin = {
    Regional: 5,
    Citywide: 257,
    "City Center/Business District": 1430,
    "Transit Oriented": 18,
    "Main Street/Special": 33,
  };

  const checkScope = async (scopeType) => {
    await page.selectOption(".filter--scope", scopeType);

    const min = Array.isArray(scopeType)
      ? scopeType.reduce((sum, key) => sum + (scopeMin[key] || 0), 0)
      : scopeMin[scopeType] || 0;
    const cities = await getNumCities(page);

    expect(cities >= min && cities < min * 1.5).toBe(true);
  };

  await checkScope("Regional");
  await checkScope("Citywide");
  await checkScope("City Center/Business District");
  await checkScope("Transit Oriented");
  await checkScope("Main Street/Special");
  await checkScope(["Transit Oriented", "City Center/Business District"]);
});