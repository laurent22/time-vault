// Runs before the rest of the shim: pulls the values the shim needs at
// construction time out of the main process, synchronously, so that
// preferences.js and filesystem.js can be plain synchronous globals the way
// Konfabulator's were.

'use strict';

globalThis.KON_PREFS_STORED = (globalThis.tvHost && globalThis.tvHost.loadPreferences)
	? globalThis.tvHost.loadPreferences()
	: {};
