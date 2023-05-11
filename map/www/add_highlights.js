// This function adds custom text badges to the markers
Shiny.addCustomMessageHandler("map_markers_added", function (needs_one_arg) {
  setTimeout(function () {
    $(".highlighed_icon").append(
      '<span class="notify-badge notify-badge-highlight">!!!</span>'
    );
    $(".new_icon").append(
      '<span class="notify-badge notify-badge-new">new</span>'
    );
  }, 500);
});

console.log("window.location.href: " + window.location.href);
console.log("window.location.origin: " + window.location.origin);
