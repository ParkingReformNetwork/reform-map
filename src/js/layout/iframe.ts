function isIFrame(): boolean {
  try {
    return window.self !== window.top;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return false;
  }
}

/** If the site is not inside an iframe, disable the full-screen icon
 * because it's redundant.
 *
 * Note that _header.scss also disables the icon on mobile.
 */
export default function maybeDisableFullScreenIcon(): void {
  if (isIFrame()) return;
  const iconContainer = document.querySelector(
    ".header-full-screen-icon-container",
  );
  if (!(iconContainer instanceof HTMLAnchorElement)) return;
  iconContainer.style.display = "none";
}
