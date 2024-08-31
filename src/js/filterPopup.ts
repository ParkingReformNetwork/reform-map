import Observable from "./Observable";

export type FilterPopupVisibleObservable = Observable<boolean>;

function updateFilterPopupUI(isVisible: boolean): void {
  const popup = document.querySelector<HTMLElement>(".filter-popup");
  const icon = document.querySelector(".header-filter-icon-container");
  if (!popup || !icon) return;
  popup.hidden = !isVisible;
  icon.ariaExpanded = isVisible.toString();
}

export default function initFilterPopup(): FilterPopupVisibleObservable {
  const isVisible = new Observable<boolean>(false);
  isVisible.subscribe(updateFilterPopupUI);

  const popup = document.querySelector(".filter-popup");
  const icon = document.querySelector(".header-filter-icon-container");
  if (!icon) throw new Error("icon not found");

  icon.addEventListener("click", () => {
    isVisible.setValue(!isVisible.getValue());
  });

  // Clicks outside the popup close it.
  window.addEventListener("click", (event) => {
    if (
      isVisible.getValue() === true &&
      event.target instanceof Element &&
      !icon?.contains(event.target) &&
      !popup?.contains(event.target)
    ) {
      isVisible.setValue(false);
    }
  });

  return isVisible;
}
