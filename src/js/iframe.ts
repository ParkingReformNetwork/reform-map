/* global document, window */

const isIFrame = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return false;
  }
};

/** If the site is not inside an iframe, disable the full-screen icon
 * because it's redundant.
 *
 * Note that _header.scss also disables the icon on mobile.
 */
const maybeDisableFullScreenIcon = (): void => {
  if (isIFrame()) return;
  const iconContainer = document.querySelector(
    ".header-full-screen-icon-container"
  );
  if (!(iconContainer instanceof HTMLAnchorElement)) return;
  iconContainer.style.display = "none";
};

export default maybeDisableFullScreenIcon;
