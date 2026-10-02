// Window zoom.
//
// The widget is 1x artwork laid out in fixed pixel coordinates, which is small
// on a modern display. Scaling the stage magnifies everything — skin, text,
// drawer — without the layout code knowing: it keeps working in the original
// coordinates, and only the final composite is scaled.
//
// Deliberately a CSS transform rather than webContents.setZoomFactor().
// Electron's zoom changes what a CSS pixel means, so the viewport shrinks and
// the window stays the same size — the widget ends up clipped. The transform
// scales real geometry, which the window refit in shim/interaction.js then
// measures and follows for free.
//
// The artwork is bitmap, so zooming interpolates; it won't be as crisp as the
// 2x re-export the PSDs would allow. That's a fair trade for one line of
// rendering code, and the PSDs are still there if sharper assets are wanted.

'use strict';

(function () {
	const LEVELS = [1, 1.25, 1.5, 2, 3];
	const MIN = LEVELS[0];
	const MAX = LEVELS[LEVELS.length - 1];

	function current() {
		const v = Number(globalThis.preferences.zoomLevel.value);
		return Number.isFinite(v) && v >= MIN && v <= MAX ? v : 1;
	}

	function apply(factor) {
		const stage = document.getElementById('stage');
		if (!stage) return;
		// From the top-left, so the widget grows down and right from where
		// the window already is rather than drifting.
		stage.style.transformOrigin = '0 0';
		stage.style.transform = factor === 1 ? '' : `scale(${factor})`;
	}

	function set(factor) {
		const clamped = Math.min(MAX, Math.max(MIN, Number(factor) || 1));
		globalThis.preferences.zoomLevel.value = String(clamped);
		if (typeof globalThis.savePreferences === 'function') globalThis.savePreferences();
		apply(clamped);
	}

	// Steps through the preset levels rather than scaling by an arbitrary
	// amount, so the sizes stay predictable.
	function step(direction) {
		const now = current();
		let index = LEVELS.findIndex((l) => Math.abs(l - now) < 0.001);
		if (index === -1) index = 0;
		set(LEVELS[Math.min(LEVELS.length - 1, Math.max(0, index + direction))]);
	}

	globalThis.konZoom = current;
	globalThis.konSetZoom = set;
	globalThis.konZoomLevels = () => LEVELS.slice();

	document.addEventListener('kon-widget-ready', () => {
		apply(current());

		const win = globalThis.gMainWindow;
		if (!win || typeof win.onContextMenu !== 'function') return;

		// Appended from here rather than edited into MainWindow.js, so the
		// ported code stays close to the original.
		const original = win.onContextMenu;
		win.onContextMenu = function (...args) {
			original.apply(this, args);

			const items = this.win.contextMenuItems || [];
			const now = current();

			const separator = new MenuItem();
			separator.title = '-';
			items.push(separator);

			for (const level of LEVELS) {
				const it = new MenuItem();
				it.title = `${loc('mainWindow_ctxMenu_zoom') || 'Zoom'} ${level}x`;
				it.checked = Math.abs(level - now) < 0.001;
				it.__zoom = level;
				it.onSelect = function () { set(this.__zoom); };
				items.push(it);
			}

			this.win.contextMenuItems = items;
		};
	});

	// Cmd-+ / Cmd-- / Cmd-0, as any other window would.
	document.addEventListener('keydown', (e) => {
		if (!e.metaKey && !e.ctrlKey) return;
		if (e.key === '+' || e.key === '=') { step(1); e.preventDefault(); }
		else if (e.key === '-') { step(-1); e.preventDefault(); }
		else if (e.key === '0') { set(1); e.preventDefault(); }
	});
})();
