// This function adds custom text badges to the markers
Shiny.addCustomMessageHandler("map_markers_added", function(needs_one_arg) {
	setTimeout(function(){
	    $(".highlighed_icon").append('<span class="notify-badge notify-badge-highlight">!!!</span>');
	    $(".new_icon").append('<span class="notify-badge notify-badge-new">new</span>');
    }, 100);
});
