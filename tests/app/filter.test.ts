import type { ElementHandle } from "@playwright/test";
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

  const checkScope = async (
    scopeType: string | Array<string>
  ): Promise<void> => {
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

test("population filter updates markers", async ({ page }) => {
  await loadMap(page);
  const left = await page.$(".population-slider-min");
  const right = await page.$(".population-slider-max");

  // min updated on 9/10/23
  const populationDiff = [61, 115, 538, 247, 512, 131, 128, 29, 16, 3, 1];

  const testSlider = async (
    slider: ElementHandle,
    moveToInterval: number,
    willIncrease: boolean
  ): Promise<void> => {
    const citiesBefore = await getNumCities(page);
    const sliderBefore = parseInt(await slider.inputValue(), 10);
    await slider.fill(moveToInterval.toString());
    const citiesAfter = await getNumCities(page);

    // due to the way the right slider is drawn, we're only able to test the right slider by 0.5 increments
    const fullInterval = willIncrease
      ? Math.ceil(moveToInterval)
      : Math.floor(moveToInterval);
    let diff = 0;
    const lower = Math.min(fullInterval, sliderBefore);
    const upper = Math.max(fullInterval, sliderBefore);
    for (let i = lower; i < upper; i += 1) {
      diff += populationDiff[i];
    }
    diff = willIncrease ? -diff : diff;
    expect(citiesBefore - citiesAfter >= diff).toBe(true);
  };

  await testSlider(left, 5, false); // The slider interval is between 0 - 11
  await testSlider(right, 10.5, false);
  // NOTE: Due to the way the double slider is coded, the right slider only extends 0.5 step left from where the slider head is.
  await testSlider(left, 9, false);
  await testSlider(right, 9.5, false);
  await testSlider(right, 11, true);
  await testSlider(left, 2, true);
});
