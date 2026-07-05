import { initTogglePopup } from "./popup";

export default function initAbout(): void {
  initTogglePopup({
    id: "about popup",
    popupSelector: ".about-popup",
    iconSelector: ".header-about-icon-container",
    closeIconSelector: ".about-popup-close-icon-container",
  });
}
