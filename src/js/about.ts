import Observable from "./Observable";

function updatePopupUI(visible: boolean): void {
  const popup = document.querySelector<HTMLElement>(".about-popup");
  const icon = document.querySelector(".header-about-icon-container");
  if (!popup || !icon) return;
  popup.hidden = !visible;
  icon.setAttribute("aria-expanded", visible.toString());
}

export default function initAbout(): void {
  const isVisible = new Observable<boolean>({
    initialValue: false,
  });
  isVisible.subscribe(updatePopupUI);

  const popup = document.querySelector(".about-popup");
  const headerIcon = document.querySelector(".header-about-icon-container");
  const closeIcon = document.querySelector(".about-popup-close-icon-container");

  headerIcon?.addEventListener("click", () =>
    isVisible.setValue(!isVisible.getValue()),
  );
  closeIcon?.addEventListener("click", () => isVisible.setValue(false));

  // Clicks outside the popup close it.
  window.addEventListener("click", (event) => {
    if (
      isVisible.getValue() === true &&
      event.target instanceof Element &&
      !headerIcon?.contains(event.target) &&
      !popup?.contains(event.target)
    ) {
      isVisible.setValue(false);
    }
  });

  isVisible.initialize();
}
