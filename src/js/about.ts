/* global document, window */
const setUpAbout = () => {
  const aboutPopup = document.querySelector(".about-popup");
  const aboutHeaderIcon = document.querySelector(
    ".header-about-icon-container"
  );
  if (
    !(aboutPopup instanceof HTMLElement) ||
    !(aboutHeaderIcon instanceof HTMLElement)
  )
    return;

  aboutHeaderIcon.addEventListener("click", () => {
    aboutPopup.style.display =
      aboutPopup.style.display !== "block" ? "block" : "none";
  });

  // closes window on clicks outside the info popup
  window.addEventListener("click", (event) => {
    if (
      aboutPopup.style.display === "block" &&
      event.target instanceof Element &&
      !aboutHeaderIcon.contains(event.target) &&
      !aboutPopup.contains(event.target)
    ) {
      aboutPopup.style.display = "none";
    }
  });

  const closeIcon = document.querySelector(".about-popup-close-icon-container");
  if (!(closeIcon instanceof HTMLElement)) return;
  closeIcon.addEventListener("click", () => {
    aboutPopup.style.display = "none";
  });
};

export default setUpAbout;
