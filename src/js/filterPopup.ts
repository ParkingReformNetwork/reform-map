/* global document, window */
const setUpFilterPopup = () => {
  const popupElement = document.querySelector(
    ".filters-popup-window"
  ) as HTMLElement;
  const filterIcon = document.querySelector(
    ".filters-popup-icon"
  ) as HTMLElement;

  filterIcon.addEventListener("click", () => {
    popupElement.style.display =
      popupElement.style.display !== "block" ? "block" : "none";
  });

  // closes window on clicks outside the info popup
  window.addEventListener("click", (event) => {
    if (
      event.target instanceof Node &&
      !filterIcon.contains(event.target) &&
      popupElement.style.display === "block" &&
      !popupElement.contains(event.target)
    ) {
      popupElement.style.display = "none";
      filterIcon.classList.toggle("active");
    }
  });
};

export default setUpFilterPopup;
