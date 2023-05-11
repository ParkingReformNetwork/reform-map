/* global window, document */
window.onload = function closeInfo() {
  const clickInfo = document.getElementById("click_info");
  document.onclick = function handleClick(e) {
    if (e.target.id !== "click_info") {
      clickInfo.style.display = "none";
    }
  };
};
