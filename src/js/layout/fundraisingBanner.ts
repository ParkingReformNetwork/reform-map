import { queryStringToParams } from "../state/urlEncoder";

/** A temporary banner asking visitors to support PRN during a campaign.
 *
 * To run a new campaign, update `CAMPAIGN` (and the copy in index.html).
 * The banner hides itself outside the campaign window, so nothing needs
 * to be removed when the campaign ends.
 */
export const CAMPAIGN = {
  // Changing the ID resets anyone who dismissed a previous campaign's banner.
  id: "eoy2026",
  // Inclusive, in the visitor's local time.
  start: new Date(2026, 10, 17), // Nov 17
  end: new Date(2026, 11, 31, 23, 59, 59), // Dec 31
};

const DISMISSED_KEY = `fundraising-banner-dismissed-${CAMPAIGN.id}`;

export function isCampaignActive(now: Date = new Date()): boolean {
  return now >= CAMPAIGN.start && now <= CAMPAIGN.end;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // Private browsing or blocked storage: the banner simply returns next visit.
  }
}

export default function initFundraisingBanner(queryString: string): void {
  const banner = document.querySelector<HTMLElement>(".fundraising-banner");
  const closeButton = banner?.querySelector<HTMLButtonElement>(
    ".fundraising-banner-close",
  );
  if (!banner || !closeButton) return;

  // Embeds that hide the map's own overlays shouldn't carry our appeal either.
  const params = queryStringToParams(queryString);
  if (params.has("hide-map-overlays") || !isCampaignActive() || wasDismissed())
    return;

  // Map overlays are positioned from the top of the viewport, so tell CSS
  // how much room the banner takes.
  const root = document.documentElement;
  const setHeight = () =>
    root.style.setProperty(
      "--fundraising-banner-height",
      `${banner.offsetHeight}px`,
    );
  const observer = new ResizeObserver(setHeight);

  banner.hidden = false;
  setHeight();
  observer.observe(banner);

  closeButton.addEventListener("click", () => {
    observer.disconnect();
    banner.hidden = true;
    root.style.removeProperty("--fundraising-banner-height");
    rememberDismissed();
  });
}
