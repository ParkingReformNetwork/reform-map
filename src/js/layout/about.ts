export default function initAbout(): void {
  const dialog = document.querySelector<HTMLDialogElement>("#about-popup");
  const openButton = document.querySelector(".header-about-icon-container");
  const closeButton = document.querySelector(
    ".about-popup-close-icon-container",
  );
  if (!dialog || !openButton || !closeButton) return;

  openButton.addEventListener("click", () => dialog.showModal());
  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    // Clicks on ::backdrop report the dialog itself as the target, unlike clicks on its content.
    if (event.target === dialog) dialog.close();
  });
}
