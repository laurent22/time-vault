// "Always on Top", as a persisted preference.
//
// Konfabulator widgets floated above everything by default and the engine
// offered the choice in its own menu, so the widget never implemented it.
// A frameless Electron window has no such menu, so the option is added to
// the widget's own context menu — and to the tray, for when the widget is
// behind something and hard to reach.
//
// The item is appended from here rather than edited into MainWindow.js, so
// the ported code stays as close to the original as possible.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	// Not declared in the .kon — it's new — so the preferences shim creates
	// it on first access, defaulting to empty. Konfabulator's own default was
	// to float, so an unset value means on.
	function isEnabled() {
		const v = globalThis.preferences.alwaysOnTop.value;
		return v === '' ? true : v === '1';
	}

	function setEnabled(on) {
		globalThis.preferences.alwaysOnTop.value = on ? '1' : '0';
		if (typeof globalThis.savePreferences === 'function') globalThis.savePreferences();
		if (host.setAlwaysOnTop) host.setAlwaysOnTop(on);
		if (host.setTrayState) host.setTrayState({ alwaysOnTop: on });
	}

	globalThis.konAlwaysOnTopEnabled = isEnabled;
	globalThis.konSetAlwaysOnTop = setEnabled;

	document.addEventListener('kon-widget-ready', () => {
		// Apply the saved choice at startup; the window is created floating.
		setEnabled(isEnabled());

		const win = globalThis.gMainWindow;
		if (!win || typeof win.onContextMenu !== 'function') return;

		// Wrap the widget's own handler and append to whatever it built.
		const original = win.onContextMenu;
		win.onContextMenu = function (...args) {
			original.apply(this, args);

			const items = this.win.contextMenuItems || [];

			const separator = new MenuItem();
			separator.title = '-';
			items.push(separator);

			const toggle = new MenuItem();
			toggle.title = loc('mainWindow_ctxMenu_alwaysOnTop') || 'Always on Top';
			toggle.checked = isEnabled();
			toggle.onSelect = function () { setEnabled(!isEnabled()); };
			items.push(toggle);

			this.win.contextMenuItems = items;
		};
	});

	// The tray toggles it too; it has already moved the window, so this only
	// records the choice.
	if (host.onAlwaysOnTop) {
		host.onAlwaysOnTop((on) => {
			globalThis.preferences.alwaysOnTop.value = on ? '1' : '0';
			if (typeof globalThis.savePreferences === 'function') globalThis.savePreferences();
		});
	}
})();
