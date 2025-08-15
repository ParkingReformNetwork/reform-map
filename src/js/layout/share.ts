import { PlaceFilterManager } from "../state/FilterState";
import { encodeFilterState } from "../state/urlEncoder";

async function copyToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to write to clipboard: ", err);
  }
}

function switchShareIcons(shareIcon: HTMLAnchorElement): void {
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
  filterManager.subscribe("update share link", (filterState) => {
    const shareIcon = document.querySelector<HTMLAnchorElement>(
      ".header-share-icon-container",
    );
    const fullScreenIcon = document.querySelector<HTMLAnchorElement>(
      ".header-full-screen-icon-container",
    );
    if (!shareIcon || !fullScreenIcon) return;

    const shareUrl = createUrl(encodeFilterState(filterState));
    shareIcon.addEventListener("click", async () => {
      await copyToClipboard(shareUrl);
      switchShareIcons(shareIcon);
    });
    fullScreenIcon.href = shareUrl;
  });
}
