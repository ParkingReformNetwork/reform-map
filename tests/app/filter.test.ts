import type { ElementHandle } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { loadMap, getNumCities } from "./utils";

const openFilterPopup = async (page): Promise<void> => {
  page.locator(".filters-popup-icon").click();
};

const findDiff = async (
  page,
  filterType: string,
  optionText: string
): Promise<number> => {
  const citiesBefore = await getNumCities(page);

  // Find and click the scope option element
  const optionElement = await page.$(
    `.${filterType} option:has-text("${optionText}")`
  );
  await optionElement.click();

  const citiesAfter = await getNumCities(page);
  const citiesDiff = Math.abs(citiesAfter - citiesBefore);
  return citiesDiff;
};

test.fixme(
  "scope, policy, land, implementation filter updates markers",
  async ({ page }) => {
    await loadMap(page);
    await openFilterPopup(page);
    const FILTER_OPTIONS = {
      scope: { Regional: 41 },
      "policy-change": { "Reduce Parking Minimums": 294 },
      "land-use": { "All Uses": 1113 },
      "implementation-stage": { Implemented: 433 },
    };
    /* eslint-disable no-await-in-loop */
    for (const filterType of Object.keys(FILTER_OPTIONS)) {
      const optionDict = FILTER_OPTIONS[filterType];
      const option = Object.keys(optionDict)[0];
      const diff = await findDiff(page, filterType, option);
      expect(diff >= optionDict[option]).toBe(true);
    }
    /* eslint-enable no-await-in-loop */
  }
);

test.fixme("population slider updates markers", async ({ page }) => {
  await loadMap(page);
  await openFilterPopup(page);
  const left = await page.$(".population-slider-left");
  const right = await page.$(".population-slider-right");

  // min updated on 10/10/23
  const populationDiff = [63, 119, 565, 253, 537, 142, 124, 28, 16, 4, 0];

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
    let expectedDiff = 0;
    for (let i = lower; i < upper; i += 1) {
      expectedDiff += populationDiff[i];
    }

    // We cannot use absolute value. For example, the edge case actuallDiff = 100 and expectedDiff = -100.
    if (willIncrease) {
      expect(
        actualDiff >= expectedDiff && actualDiff <= expectedDiff * 1.5
      ).toBe(true);
    } else {
      expect(
        actualDiff <= -expectedDiff && actualDiff >= -expectedDiff * 1.5
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
