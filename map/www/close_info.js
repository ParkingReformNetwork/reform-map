window.onload = function () {
  var click_info = document.getElementById("click_info");
  document.onclick = function (e) {
    if (e.target.id !== "click_info") {
      click_info.style.display = "none";
    }
  };
};
