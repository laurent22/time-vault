// The Joplin sync, as an opt-in preference.
//
// Off by default: it talks to another application over the network and needs
// authorisation, so it shouldn't appear in the UI at all unless asked for.
// Three settings, none declared in the .kon since they're new:
//
//   joplinSyncEnabled   "1" to switch the feature on
//   joplinSyncOnStop    "1" to sync automatically after each timed entry
//   joplinSyncOnQuit    "1" to sync when the app closes
//
// Enabling it only reveals the commands; the first actual sync is what
// triggers Joplin's authorisation prompt.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	const pref = (name) => globalThis.preferences[name];
	const isOn = (name) => pref(name).value === '1';

	function setPref(name, on) {
		pref(name).value = on ? '1' : '0';
		if (typeof globalThis.savePreferences === 'function') globalThis.savePreferences();
	}

	const enabled = () => isOn('joplinSyncEnabled');

	globalThis.konJoplinEnabled = enabled;
	globalThis.konJoplinSetEnabled = (on) => { setPref('joplinSyncEnabled', on); publish(); };

	// Tell the main process, so the Joplin commands appear in or vanish from
	// the application menu.
	function publish() {
		if (host.joplinSetEnabled) host.joplinSetEnabled(enabled());
	}

	// Syncs quietly: no dialogs, no prompt. Used by the automatic triggers,
	// which must never interrupt. If authorisation is missing the sync is
	// skipped rather than demanding attention mid-task.
	function syncQuietly(reason) {
		if (!enabled() || !host.joplinSync) return;
		host.joplinSync({ interactive: false }).then((r) => {
			if (r && r.ok && r.result) {
				console.log(`[joplin] synced after ${reason}:`,
					`${r.result.projects} projects, ${r.result.events} entries`);
			}
		}).catch((e) => console.warn('[joplin] background sync failed:', e.message));
	}

	globalThis.konJoplinSyncQuietly = syncQuietly;

	document.addEventListener('kon-widget-ready', () => {
		publish();

		// The preferences window can turn it on or off, so re-publish once
		// the widget has applied whatever changed.
		if (typeof globalThis.widget === 'object' && globalThis.widget) {
			const originalChanged = globalThis.widget.onPreferencesChanged;
			globalThis.widget.onPreferencesChanged = function (...args) {
				if (typeof originalChanged === 'function') originalChanged.apply(this, args);
				publish();
			};
		}

		const win = globalThis.gMainWindow;
		if (!win) return;

		// Sync when a timed entry finishes, if asked to. The capsule opening
		// is what marks the end of an entry — see shim/commands.js for why
		// that's the run flag.
		if (typeof win.toggleEventTimer === 'function') {
			const originalToggle = win.toggleEventTimer;
			win.toggleEventTimer = function (...args) {
				const wasRunning = this.opened === false;
				const result = originalToggle.apply(this, args);
				if (wasRunning && this.opened === true && isOn('joplinSyncOnStop')) {
					syncQuietly('stopping the timer');
				}
				return result;
			};
		}

		if (typeof win.onContextMenu !== 'function') return;

		// Appended from the shim rather than edited into MainWindow.js.
		const originalMenu = win.onContextMenu;
		win.onContextMenu = function (...args) {
			originalMenu.apply(this, args);
			if (!enabled()) return;

			const items = this.win.contextMenuItems || [];

			const it = new MenuItem();
			it.title = loc('mainWindow_ctxMenu_syncJoplin') || 'Sync to Joplin now';
			it.onSelect = function () { if (host.joplinSync) host.joplinSync(); };
			items.push(it);

			this.win.contextMenuItems = items;
		};
	});

	// Sync on quit, if asked to. beforeunload is synchronous, so this can
	// only start the request — the main process finishes it during shutdown.
	globalThis.addEventListener('beforeunload', () => {
		if (enabled() && isOn('joplinSyncOnQuit') && host.joplinSyncOnQuit) {
			host.joplinSyncOnQuit();
		}
	});
})();
