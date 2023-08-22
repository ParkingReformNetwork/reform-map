import { expect, test } from "@playwright/test";

test("about popup can be opened and closed", async ({ page }) => {
  await page.goto("");

  const aboutIcon = ".info-icon";

  const aboutIsVisible = async () =>
    page.$eval(".about-popup", (el) => el.style.display === "block");

  // before click
  expect(await aboutIsVisible()).toBe(false);

  // click about icon (open popup)
  await page.click(aboutIcon);
  expect(await aboutIsVisible()).toBe(true);

  // click about icon (close popup)
  await page.click(aboutIcon);
  expect(await aboutIsVisible()).toBe(false);

  // click about icon (open popup)
  await page.click(aboutIcon);
  expect(await aboutIsVisible()).toBe(true);

  // click x icon in popup
  await page.click(".about-popup-close-icon");
  expect(await aboutIsVisible()).toBe(false);

  // click about icon (open popup)
  await page.click(aboutIcon);
  expect(await aboutIsVisible()).toBe(true);

  // click header
  await page.click("header");
  expect(await aboutIsVisible()).toBe(false);
});
