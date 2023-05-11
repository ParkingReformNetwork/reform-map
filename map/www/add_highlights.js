/* global Shiny, window, $ */
/* eslint-disable no-console */

// This function adds custom text badges to the markers
Shiny.addCustomMessageHandler("map_markers_added", () => {
  setTimeout(() => {
    $(".highlighed_icon").append(
      '<span class="notify-badge notify-badge-highlight">!!!</span>'
    );
    $(".new_icon").append(
      '<span class="notify-badge notify-badge-new">new</span>'
    );
  }, 500);
});

console.log(`window.location.href: ${window.location.href}`);
console.log(`window.location.origin: ${window.location.origin}`);
