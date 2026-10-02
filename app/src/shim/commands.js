// Connects the menu bar and tray to the widget.
//
// Konfabulator had no menus — the widget was driven entirely by clicking its
// own artwork and its context menu. A frameless Electron window needs real
// menu commands to be reachable at all, and they're routed to the same
// methods the skin's buttons call so there's one code path, not two.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	// The zoom shim owns the preset list; this just walks it.
	function nextZoom(direction) {
		const levels = globalThis.konZoomLevels ? globalThis.konZoomLevels() : [1];
		const now = globalThis.konZoom ? globalThis.konZoom() : 1;
		let i = levels.findIndex((l) => Math.abs(l - now) < 0.001);
		if (i === -1) i = 0;
		return levels[Math.min(levels.length - 1, Math.max(0, i + direction))];
	}

	function withWindow(fn) {
		// gMainWindow only exists once the widget scripts have run.
		const w = globalThis.gMainWindow;
		if (!w) {
			console.warn('[commands] the widget is not ready yet');
			return;
		}
		try {
			fn(w);
		} catch (e) {
			console.error('[commands] failed:', e.message);
		}
	}

	const handlers = {
		'menu:preferences': () => globalThis.konShowPreferences(),
		'tray:preferences': () => globalThis.konShowPreferences(),

		'menu:toggle-timer': () => withWindow((w) => w.toggleEventTimer()),
		'tray:toggle-timer': () => withWindow((w) => w.toggleEventTimer()),

		'menu:toggle-drawer': () => withWindow((w) => w.expandButton_clicked()),

		'menu:publish-reports': () => {
			if (globalThis.Main && typeof Main.publishProjects === 'function') Main.publishProjects();
		},
		'menu:reveal-reports': () => {
			if (globalThis.Main && typeof Main.revealReportFolder === 'function') Main.revealReportFolder();
		},

		// The sync runs automatically, so it has no command. Forgetting the
		// token does: it's how a revoked authorisation is renewed, since the
		// silent syncs won't prompt.
		'menu:joplin-forget': () => { if (host.joplinForget) host.joplinForget(); },

		'menu:about': () => { if (host.showAbout) host.showAbout(); },
		'tray:about': () => { if (host.showAbout) host.showAbout(); },

		'menu:zoom-in': () => globalThis.konSetZoom(nextZoom(1)),
		'menu:zoom-out': () => globalThis.konSetZoom(nextZoom(-1)),
		'menu:zoom-reset': () => globalThis.konSetZoom(1),

		'menu:reset-position': () => {
			if (host.setPosition) host.setPosition(60, 60);
			if (globalThis.preferences) globalThis.preferences.windowLocation.value = '60,60';
		},
	};

	if (host.onCommand) {
		host.onCommand((channel) => {
			const fn = handlers[channel];
			if (fn) fn();
			else console.warn('[commands] unknown command:', channel);
		});
	}

	// --- tray state ---------------------------------------------------------
	// The tray shows the running project and elapsed time, so it needs
	// telling whenever those change. The widget has no hook for it, so this
	// samples instead — cheap, and the tray menu only renders when opened.

	let last = '';

	function pushTrayState() {
		const w = globalThis.gMainWindow;
		if (!w || !host.setTrayState) return;

		// `opened` is the capsule state, and it's the actual run flag: the
		// capsule closes around the clock while timing and opens when
		// stopped, which is why MainWindow shows the stop icon at opened
		// == false. projectEvent is merely "a project is loaded" — true
		// from startup — so using it left the tray permanently offering
		// "Stop timer".
		const running = !!w.projectEvent && w.opened === false;
		const elapsed = running ? String(w.eventTimeText ? w.eventTimeText.data : '') : '';
		const project = w.projectNameText ? String(w.projectNameText.data) : '';

		const key = `${running}|${elapsed}|${project}`;
		if (key === last) return;
		last = key;

		host.setTrayState({ running, elapsed, project });
	}

	document.addEventListener('kon-widget-ready', () => {
		pushTrayState();
		setInterval(pushTrayState, 1000);
	});
})();
