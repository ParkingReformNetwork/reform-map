const containerElem = document.querySelector('#content');

const setFullScreen = (val) => {
	if (val === true) {
		containerElem.classList.add('expanded');
	} else if (val === false) {
		containerElem.classList.remove('expanded')
	} else {
		containerElem.classList.toggle('expanded');
	}
};

document.body.addEventListener('keyup', (ev) => {
	if (ev.key === 'Escape') {
		if (containerElem.classList.contains('expanded')) {
			containerElem.classList.remove('expanded');
		}
	}
});
