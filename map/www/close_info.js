/* global window, document */
window.onload = () => {
  const clickInfo = document.getElementById("click_info");
  document.onclick = (e) => {
    if (e.target.id !== "click_info") {
      clickInfo.style.display = "none";
    }
  };
};
