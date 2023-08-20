/* global document, window */
const setUpAbout = () => {
    
    const aboutElement = document.querySelector(".about-popup");
    const infoButton = document.querySelector(".info-icon");
    
    infoButton.addEventListener("click", () => {
        aboutElement.style.display =
        aboutElement.style.display !== "block" ? "block" : "none";
    });

    // closes window on clicks outside the info popup
    window.addEventListener("click", (event) => {
        if (
        !infoButton.contains(event.target) &&
        aboutElement.style.display === "block" &&
        !aboutElement.contains(event.target)
        ) {
        aboutElement.style.display = "none";
        infoButton.classList.toggle("active");
        }
    });

    // Note that the close element will only render when the about text popup is rendered.
    // So, it only ever makes sense for a click to close.
    document.querySelector(".close-about").addEventListener("click", () => {
        aboutElement.style.display = "none";
        infoButton.classList.toggle("active");
    });
};

export default setUpAbout;