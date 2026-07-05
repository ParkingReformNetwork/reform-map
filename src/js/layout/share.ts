import type { PlaceFilterManager } from "../state/FilterState";
import { encodeFilterState } from "../state/urlEncoder";

async function copyToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch (err) {
    console.error("Failed to write to clipboard: ", err);
  }
}

function switchShareIcons(shareIcon: HTMLButtonElement): void {
  const linkIcon = shareIcon.querySelector<SVGElement>("svg.share-link-icon");
  const checkIcon = shareIcon.querySelector<SVGElement>("svg.share-check-icon");
  if (!linkIcon || !checkIcon) return;

  linkIcon.style.display = "none";
  checkIcon.style.display = "inline-block";
  setTimeout(() => {
    linkIcon.style.display = "inline-block";
    checkIcon.style.display = "none";
  }, 1000);
}

export function createUrl(searchParams: URLSearchParams): string {
  const url = new URL(window.location.href);
  url.search = searchParams.toString();
  return url.toString();
}

export default function initShareLink(filterManager: PlaceFilterManager): void {
  const shareIcon = document.querySelector<HTMLButtonElement>(
    ".header-share-icon-container",
  );
  const fullScreenIcon = document.querySelector<HTMLAnchorElement>(
    ".header-full-screen-icon-container",
  );
  if (!shareIcon || !fullScreenIcon) return;

  let shareUrl = createUrl(encodeFilterState(filterManager.getState()));
  filterManager.subscribe("update share link", (filterState) => {
    shareUrl = createUrl(encodeFilterState(filterState));
    fullScreenIcon.href = shareUrl;
  });

  shareIcon.addEventListener("click", async () => {
    await copyToClipboard(shareUrl);
    switchShareIcons(shareIcon);
  });
}
