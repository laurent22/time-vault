// Konfabulator's `filesystem`, `system`, `widget` and `screen` globals.
//
// All real file access happens in the main process; the renderer calls through
// the preload bridge. Konfabulator's filesystem API is synchronous, and the
// ported code relies on that (it branches on itemExists() and then reads in
// the same expression), so these are exposed as sync IPC calls rather than
// promises. The volume is low — a handful of calls on load and on report
// export — so the round-trip cost doesn't matter.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	function fsCall(method, ...args) {
		if (!host.fs) {
			console.warn(`[filesystem] ${method} called with no host bridge`);
			return undefined;
		}
		return host.fs(method, ...args);
	}

	globalThis.filesystem = {
		itemExists: (p) => fsCall('itemExists', p),
		isDirectory: (p) => fsCall('isDirectory', p),
		createDirectory: (p) => fsCall('createDirectory', p),
		getDirectoryContents: (p) => fsCall('getDirectoryContents', p) || [],
		readFile: (p) => fsCall('readFile', p),
		writeFile: (p, data) => fsCall('writeFile', p, data),
		remove: (p) => fsCall('remove', p),
		copy: (from, to) => fsCall('copy', from, to),
		// "Reveal in Finder"; not load-bearing, so a failure is non-fatal.
		reveal: (p) => fsCall('reveal', p),
	};

	// --- system -------------------------------------------------------------
	// system.event is Konfabulator's "current event" object, consulted during
	// mouse handling for modifier keys and click coordinates. It's updated by
	// the primitives shim as events arrive.

	globalThis.system = {
		get widgetDataFolder() { return host.widgetDataFolder ? host.widgetDataFolder() : ''; },
		get platform() {
			// Konfabulator reported "macintosh" or "windows".
			const p = host.platform ? host.platform() : 'darwin';
			return p === 'darwin' ? 'macintosh' : 'windows';
		},
		event: {
			shiftKey: false,
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			x: 0,
			y: 0,
			screenX: 0,
			screenY: 0,
		},
	};

	// Keep system.event current; the widget reads it inside mouse handlers
	// rather than taking the event as an argument.
	globalThis.addEventListener('mousedown', updateSystemEvent, true);
	globalThis.addEventListener('mouseup', updateSystemEvent, true);
	globalThis.addEventListener('mousemove', updateSystemEvent, true);
	globalThis.addEventListener('keydown', updateSystemEvent, true);

	function updateSystemEvent(e) {
		const ev = globalThis.system.event;
		ev.shiftKey = !!e.shiftKey;
		ev.altKey = !!e.altKey;
		ev.ctrlKey = !!e.ctrlKey;
		ev.metaKey = !!e.metaKey;
		if (e.clientX !== undefined) {
			ev.x = e.clientX;
			ev.y = e.clientY;
			ev.screenX = e.screenX;
			ev.screenY = e.screenY;
		}
	}

	// --- widget -------------------------------------------------------------

	globalThis.widget = {
		name: 'TimeVault',
		version: host.appVersion ? host.appVersion() : '0.1.0',
		get locale() { return (globalThis.navigator && navigator.language) || 'en'; },
		// Konfabulator extracted files out of the widget bundle; the port ships
		// them unpacked, so the path is already usable.
		extractFile: (p) => p,
		setDockItem: () => {},
		onWillChangePreferences: null,
		onPreferencesChanged: null,
	};

	// --- screen -------------------------------------------------------------
	// Konfabulator's screen dimensions are the usable work area, excluding the
	// menu bar and Dock. Seeded synchronously from the host at startup.

	globalThis.screen = {
		width: (host.workArea && host.workArea().width) || 1440,
		height: (host.workArea && host.workArea().height) || 900,
		availWidth: (host.workArea && host.workArea().width) || 1440,
		availHeight: (host.workArea && host.workArea().height) || 900,
	};

	// --- misc globals -------------------------------------------------------

	// Load order is handled by script tags in index.html, so this is a no-op.
	// Kept because Main.js calls it 25 times.
	globalThis.includeFile = function includeFile() {};

	globalThis.openURL = function openURL(url) {
		if (host.openExternal) host.openExternal(url);
	};

	globalThis.reloadWidget = function reloadWidget() {
		globalThis.location.reload();
	};

	globalThis.suppressUpdates = function suppressUpdates() {};
	globalThis.play = function play() {};
})();
