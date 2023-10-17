const SHARE_URL = "https://parkingreform.org/resources/mandates-map";

const copyToClipboard = async (value: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to write to clipboard: ", err);
  }
};

const switchIcons = (shareIcon: HTMLAnchorElement): void => {
  const linkIcon = shareIcon.querySelector("svg.share-link-icon") as SVGElement;
  const checkIcon = shareIcon.querySelector(
    "svg.share-check-icon"
  ) as SVGElement;
  linkIcon.style.display = "none";
  checkIcon.style.display = "inline-block";
  setTimeout(() => {
    linkIcon.style.display = "inline-block";
    checkIcon.style.display = "none";
  }, 1000);
};

const setUpShareIcon = (): void => {
  const shareIcon = document.querySelector(".share-icon") as HTMLAnchorElement;
  shareIcon.addEventListener("click", async () => {
    await copyToClipboard(SHARE_URL);
    switchIcons(shareIcon);
  });
};

export { setUpShareIcon, SHARE_URL };
