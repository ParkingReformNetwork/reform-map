import { initTogglePopup } from "./popup";

export default function initFilterPopup(): void {
  initTogglePopup({
    id: "filter popup",
    popupSelector: ".filter-popup",
    iconSelector: ".header-filter-icon-container",
  });
}
