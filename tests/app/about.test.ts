import { expect, test } from "@playwright/test";
import { HEADER_ICON } from "./utils";

test("about popup can be opened and closed", async ({ page }) => {
  await page.goto("");

  const aboutIcon = HEADER_ICON.about;
  const aboutPopup = page.locator(".about-popup");

  // before click
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

  // click the backdrop, outside the dialog's content box
  await page.mouse.click(5, 5);
  await expect(aboutPopup).toBeHidden();
});
