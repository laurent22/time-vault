// Centres a dialog on the widget rather than on the screen.
//
// Electron centres a new window on the display by default. The widget is
// small and lives wherever the user parked it — a corner, a second monitor —
// so a screen-centred dialog can appear a long way from where they are
// looking, and on a different display entirely.

'use strict';

const { screen } = require('electron');

// Keeps the dialog fully on the same display as the widget, so centring on a
// widget near an edge doesn't push half the dialog off-screen.
function centreOnParent(win, parent) {
	if (!win || win.isDestroyed()) return;
	if (!parent || parent.isDestroyed()) return;

	const p = parent.getBounds();
	const d = win.getBounds();

	let x = Math.round(p.x + (p.width - d.width) / 2);
	let y = Math.round(p.y + (p.height - d.height) / 2);

	const area = screen.getDisplayMatching(p).workArea;
	x = Math.max(area.x, Math.min(x, area.x + area.width - d.width));
	y = Math.max(area.y, Math.min(y, area.y + area.height - d.height));

	win.setPosition(x, y);
}

module.exports = { centreOnParent };
