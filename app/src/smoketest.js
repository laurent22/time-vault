// Step 1 of the port: prove the transparent frameless window composites the
// original skin art correctly, and that the 3-piece horizontal stretch (the
// original's ThreePiecesRectangle, from Imaging.js) can be done with CSS.
//
// This file is scaffolding. It gets deleted once MainWindow.js runs against
// the real shim.

const SKIN = '../assets/Skin/Default';

const stage = document.getElementById('stage');

function img(src, left, top, extra = {}) {
	const el = document.createElement('img');
	el.src = `${SKIN}/${src}`;
	el.style.position = 'absolute';
	el.style.left = `${left}px`;
	el.style.top = `${top}px`;
	Object.assign(el.style, extra);
	stage.appendChild(el);
	return el;
}

// --- The right-hand background: left cap, stretched middle, right cap -------
// BackgroundRight_Middle.png is 1px wide and tiles horizontally; this is
// exactly what border-image / repeat-x replaces the hand-rolled slicing with.
const RIGHT_X = 40;
const RIGHT_W = 300;
const CAP_L = 7;
const CAP_R = 41;

img('BackgroundRight_Left.png', RIGHT_X, 0);

const middle = document.createElement('div');
middle.style.cssText = `
	position: absolute;
	left: ${RIGHT_X + CAP_L}px;
	top: 0;
	width: ${RIGHT_W - CAP_L - CAP_R}px;
	height: 89px;
	background-image: url(${SKIN}/BackgroundRight_Middle.png);
	background-repeat: repeat-x;
`;
stage.appendChild(middle);

img('BackgroundRight_Right.png', RIGHT_X + RIGHT_W - CAP_R, 0);

// --- The left pod, which overlaps the right part ---------------------------
img('BackgroundLeft.png', 0, 0);
img('StartButtonClip.png', 12, 15);
img('StartButtonPlayIcon.png', 23, 40);

// --- Text, to check font rendering over the skin ---------------------------
const label = document.createElement('div');
label.style.cssText = `
	position: absolute;
	left: ${RIGHT_X + 8}px;
	top: 11px;
	font: bold 22px "Helvetica Neue", Helvetica, Arial, sans-serif;
	color: #ffffff;
`;
label.textContent = '12h 15m 17s';
stage.appendChild(label);

// --- Dragging, since there's no titlebar ----------------------------------
let dragging = false;
let lastX = 0;
let lastY = 0;

document.addEventListener('mousedown', (e) => {
	dragging = true;
	lastX = e.screenX;
	lastY = e.screenY;
});

document.addEventListener('mousemove', (e) => {
	if (!dragging) return;
	window.tvHost.moveBy(e.screenX - lastX, e.screenY - lastY);
	lastX = e.screenX;
	lastY = e.screenY;
});

document.addEventListener('mouseup', () => {
	dragging = false;
});

// Esc quits, since there's no window chrome to close with yet.
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') window.close();
});
