// The Joplin sync, as an opt-in preference.
//
// One setting, joplinSyncEnabled, not declared in the .kon since it's new.
// Off by default: it talks to another application over the network and needs
// authorisation, so it shouldn't happen unless asked for.
//
// Once on it is entirely automatic — there is no "sync now" command. It syncs
// at startup, whenever anything in the projects or events changes, and on
// quit. Switching the setting on is what triggers Joplin's authorisation
// prompt, since that's the moment the user asked for the feature.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	// Changes arrive in bursts — saving one event is several statements, and
	// "delete all" is one per row — so a sync is scheduled rather than run,
	// and a later change inside the window replaces the pending one.
	// Overridable so the tests don't have to wait three seconds a case.
	const DEBOUNCE_MS = () => globalThis.KON_JOPLIN_DEBOUNCE_MS || 3000;

	function setPref(name, on) {
		globalThis.preferences[name].value = on ? '1' : '0';
		if (typeof globalThis.savePreferences === 'function') globalThis.savePreferences();
	}

	const enabled = () => globalThis.preferences.joplinSyncEnabled.value === '1';

	globalThis.konJoplinEnabled = enabled;
	globalThis.konJoplinSetEnabled = (on) => { setPref('joplinSyncEnabled', on); publish(); };

	function publish() {
		const on = enabled();
		if (host.joplinSetEnabled) host.joplinSetEnabled(on);
		// Switching it on syncs straight away, which is also what obtains
		// authorisation the first time.
		if (on) syncQuietly('the setting being switched on');
	}

	// Syncs, and says nothing. Authorisation is the main process's business:
	// every sync there asks for it when there's no usable token, so there is
	// no separate "authorise" step to coordinate from here. An earlier
	// version gated this on a status check and passed interactive:false,
	// which meant the automatic triggers could never authorise — and since
	// every trigger is automatic, the feature could never start working.
	// Counts syncs that actually fired, so the tests can assert on the
	// triggers without reaching into tvHost — contextBridge freezes it, so a
	// spy can't be installed there. Counted here rather than in scheduleSync
	// so the undebounced callers (startup, enabling the setting) register too.
	globalThis.KON_JOPLIN_SYNC_COUNT = 0;

	function syncQuietly(reason) {
		if (!enabled() || !host.joplinSync) return;
		globalThis.KON_JOPLIN_SYNC_COUNT++;
		host.joplinSync().then((r) => {
			if (r && r.ok && r.result) {
				console.log(`[joplin] synced after ${reason}:`,
					`${r.result.projects} projects, ${r.result.events} entries`);
			}
		}).catch((e) => console.warn('[joplin] sync failed:', e.message));
	}

	let pending = null;

	function scheduleSync(reason) {
		if (!enabled()) return;
		if (pending) clearTimeout(pending);
		pending = setTimeout(() => {
			pending = null;
			syncQuietly(reason);
		}, DEBOUNCE_MS());
	}

	globalThis.konJoplinSyncQuietly = syncQuietly;
	globalThis.konJoplinScheduleSync = scheduleSync;

	// Every write the widget makes goes through Database.exec — saving an
	// event, adding a project, deleting a task. Watching that one chokepoint
	// catches all of them, including paths a hand-written list would miss.
	// Reads go through query(), so they don't come through here.
	function watchDatabaseWrites() {
		if (typeof globalThis.Database !== 'function') return false;
		const proto = globalThis.Database.prototype;
		if (typeof proto.exec !== 'function' || proto.__joplinWatched) return false;

		const originalExec = proto.exec;
		proto.exec = function (iSQL) {
			const result = originalExec.apply(this, arguments);
			// Only data changes matter; CREATE TABLE and the like run at
			// startup and would sync before anything has happened.
			if (/^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(String(iSQL || ''))) {
				scheduleSync('a change to the data');
			}
			return result;
		};
		proto.__joplinWatched = true;
		return true;
	}

	globalThis.konJoplinWatchDatabaseWrites = watchDatabaseWrites;

	document.addEventListener('kon-widget-ready', () => {
		publish();
		watchDatabaseWrites();

		// The preferences window can turn it on or off, so re-publish once
		// the widget has applied whatever changed.
		if (typeof globalThis.widget === 'object' && globalThis.widget) {
			const originalChanged = globalThis.widget.onPreferencesChanged;
			globalThis.widget.onPreferencesChanged = function (...args) {
				if (typeof originalChanged === 'function') originalChanged.apply(this, args);
				publish();
			};
		}

		// Sync at startup, so Joplin reflects whatever happened while the app
		// was closed — including edits made to the database by hand. Delayed
		// past boot so it doesn't compete with loading the widget, and so the
		// schema setup that runs on a fresh database doesn't trigger it twice.
		// This is also what asks for authorisation on a profile that hasn't
		// been granted it yet.
		setTimeout(() => syncQuietly('startup'), 5000);
	});

	// Sync on quit. beforeunload is synchronous, so this can only start the
	// request — the main process finishes it during shutdown. A debounced
	// change may still be pending, and this is what makes sure it isn't lost.
	globalThis.addEventListener('beforeunload', () => {
		if (enabled() && host.joplinSyncOnQuit) {
			host.joplinSyncOnQuit();
		}
	});
})();
