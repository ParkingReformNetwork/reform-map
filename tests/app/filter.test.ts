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

  // Check the difference between city count before and after
  const checkScope = async (scopeType: string): Promise<void> => {
    const citiesBefore = await getNumCities(page);

    // Find a click the scope option element
    const optionElement = await page.$(
      `.filter--scope option:has-text("${scopeType}")`
    );
    await optionElement.click();

    const citiesAfter = await getNumCities(page);
    const citiesDiff = Math.abs(citiesAfter - citiesBefore);
    const expectedDiff = scopeMin[scopeType];
    expect(citiesDiff >= expectedDiff && citiesDiff <= expectedDiff * 1.5).toBe(
      true
    );
  };

  await checkScope("Regional"); // clicking on an option will remove it
  await checkScope("Citywide");
  await checkScope("City Center/Business District");
  await checkScope("Transit Oriented");
  await checkScope("Transit Oriented");
  await checkScope("Main Street/Special");
  await checkScope("Transit Oriented");
  await checkScope("Citywide");
});

test("population filter updates markers", async ({ page }) => {
  await loadMap(page);
  const left = await page.$(".population-slider-left");
  const right = await page.$(".population-slider-right");

  // min updated on 9/10/23
  const populationDiff = [61, 115, 538, 247, 512, 131, 128, 29, 16, 3, 1];

  /*
    Moves slider to interval and checks to make sure the number of cities on the map is reasonable.

    willIncrease is required because this function does not know if slider is the left or right slider.
  */
  const testSlider = async (
    slider: ElementHandle,
    moveToInterval: number,
    willIncrease: boolean
  ): Promise<void> => {
    const citiesBefore = await getNumCities(page);
    const sliderBefore = parseInt(await slider.inputValue(), 10);
    await slider.fill(moveToInterval.toString());
    const actualDiff = (await getNumCities(page)) - citiesBefore;

    // Due to the way the right slider is drawn, we're only able to test the right slider by 0.5 increments.
    // As a result, fullInterval is for the 0.5 moveToInterval values provided for the right slider.
    const fullInterval = willIncrease
      ? Math.ceil(moveToInterval)
      : Math.floor(moveToInterval);
    const lower = Math.min(fullInterval, sliderBefore);
    const upper = Math.max(fullInterval, sliderBefore);

    // Using true data, calculate threshold for difference.
    let calculatedDiff = 0;
    for (let i = lower; i < upper; i += 1) {
      calculatedDiff += populationDiff[i];
    }

    // We cannot use absolute value. For example, the edge case actuallDiff = 100 and calculatedDiff = -100.
    if (willIncrease) {
      expect(
        actualDiff >= calculatedDiff && actualDiff <= calculatedDiff * 1.5
      ).toBe(true);
    } else {
      expect(
        actualDiff <= -calculatedDiff && actualDiff >= -calculatedDiff * 1.5
      ).toBe(true);
    }
  };

  // The slider interval is between 0 - 11
  // However, the each slider only renders a certain range.

  // L: 0 - 5.5   R: 5.5 - 11
  await testSlider(left, 5, false);
  // L: 0 - 8   R: 8 - 11
  await testSlider(right, 8, false);
  // L: 0 - 6.5   R: 6.5 - 11
  await testSlider(left, 6, false);
  // L: 0 - 7   R: 7 - 11
  await testSlider(right, 7, false);
  // L: 0 - 7.5   R: 7.5 - 11
  await testSlider(right, 11, true);
  // L: 0 - 8.5   R: 8.5 - 11
  await testSlider(left, 2, true);
});
