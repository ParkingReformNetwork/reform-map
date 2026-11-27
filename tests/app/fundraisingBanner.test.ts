import { expect, test } from "@playwright/test";

import {
  CAMPAIGN,
  isCampaignActive,
} from "../../src/js/layout/fundraisingBanner";

const DURING_CAMPAIGN = new Date(2026, 10, 20);

test.describe("isCampaignActive", () => {
  test("inside the window", () => {
    expect(isCampaignActive(CAMPAIGN.start)).toBe(true);
    expect(isCampaignActive(DURING_CAMPAIGN)).toBe(true);
    expect(isCampaignActive(CAMPAIGN.end)).toBe(true);
  });

  test("outside the window", () => {
    expect(isCampaignActive(new Date(2026, 10, 16, 23, 59))).toBe(false);
    expect(isCampaignActive(new Date(2027, 0, 1))).toBe(false);
  });
});

test("banner shows during the campaign and stays dismissed", async ({
  page,
}) => {
  await page.clock.setFixedTime(DURING_CAMPAIGN);
  await page.goto("");

  const banner = page.locator(".fundraising-banner");
  await expect(banner).toBeVisible();
  await expect(banner.locator(".fundraising-banner-donate")).toHaveAttribute(
    "href",
    /givelively\.org/,
  );

  await banner.locator(".fundraising-banner-close").click();
  await expect(banner).toBeHidden();

  await page.reload();
  await expect(banner).toBeHidden();
});

test("banner is hidden outside the campaign", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2027, 1, 1));
  await page.goto("");
  await expect(page.locator(".fundraising-banner")).toBeHidden();
});

test("banner is hidden when map overlays are hidden", async ({ page }) => {
  await page.clock.setFixedTime(DURING_CAMPAIGN);
  await page.goto("?hide-map-overlays");
  await expect(page.locator(".fundraising-banner")).toBeHidden();
});
