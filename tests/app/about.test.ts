import { expect, test } from "@playwright/test";

test("about popup can be opened and closed", async ({ page }) => {
  await page.goto("");

  const aboutIcon = ".header-about-icon-container";
  const aboutPopup = page.locator(".about-popup");

  // before click
  await expect(aboutPopup).toBeHidden();

  // click about icon (open popup)
  await page.click(aboutIcon);
  await expect(aboutPopup).toBeVisible();

  // click about icon (close popup)
  await page.click(aboutIcon);
  await expect(aboutPopup).toBeHidden();

  // click about icon (open popup)
  await page.click(aboutIcon);
  await expect(aboutPopup).toBeVisible();

  // click x icon in popup
  await page.click(".about-popup-close-icon-container");
  await expect(aboutPopup).toBeHidden();

  // click about icon (open popup)
  await page.click(aboutIcon);
  await expect(aboutPopup).toBeVisible();

  // click header
  await page.click("header");
  await expect(aboutPopup).toBeHidden();
});
