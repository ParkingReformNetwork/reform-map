export default function setUpAbout() {
  const aboutPopup = document.querySelector(".about-popup");
  const aboutHeaderIcon = document.querySelector(
    ".header-about-icon-container",
  );
  const closeIcon = document.querySelector(".about-popup-close-icon-container");
  if (
    !(aboutPopup instanceof HTMLElement) ||
    !(aboutHeaderIcon instanceof HTMLElement) ||
    !(closeIcon instanceof HTMLElement)
  )
    return;

  const closePopup = () => {
    aboutPopup.hidden = true;
    aboutHeaderIcon.setAttribute("aria-expanded", "false");
  };

  const openPopup = () => {
    aboutPopup.hidden = false;
    aboutHeaderIcon.setAttribute("aria-expanded", "true");
  };

  aboutHeaderIcon.addEventListener("click", () => {
    if (aboutPopup.hidden) {
      openPopup();
    } else {
      closePopup();
    }
  });

  // closes window on clicks outside the info popup
  window.addEventListener("click", (event) => {
    if (
      !aboutPopup.hidden &&
      event.target instanceof Element &&
      !aboutHeaderIcon.contains(event.target) &&
      !aboutPopup.contains(event.target)
    ) {
      closePopup();
    }
  });

  closeIcon.addEventListener("click", () => {
    closePopup();
  });
}
