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

	// The widget refers to its own files with bundle-relative paths
	// ("Resources/WidGUI/Default/Skin.xml"), which Konfabulator resolved
	// against the widget bundle. The port ships those under app/assets, so
	// such paths are redirected there. Absolute paths — the database, report
	// output, anything the user chose — are passed through untouched.
	function resolvePath(p) {
		const s = String(p == null ? '' : p);
		if (!s || s.startsWith('/') || /^[A-Za-z]:/.test(s)) return s;
		return `${assetRoot()}/${s.replace(/^Resources\//, '')}`;
	}

	let cachedAssetRoot = null;
	function assetRoot() {
		if (cachedAssetRoot === null) {
			cachedAssetRoot = host.assetRoot ? host.assetRoot() : '';
		}
		return cachedAssetRoot;
	}

	// Methods whose first argument is a path into the widget's own files.
	const PATH_METHODS = new Set([
		'itemExists', 'isDirectory', 'createDirectory', 'getDirectoryContents',
		'readFile', 'writeFile', 'remove', 'reveal',
	]);

	function fsCall(method, ...args) {
		if (!host.fs) {
			console.warn(`[filesystem] ${method} called with no host bridge`);
			return undefined;
		}
		if (PATH_METHODS.has(method) && args.length) {
			args[0] = resolvePath(args[0]);
		} else if (method === 'copy') {
			args[0] = resolvePath(args[0]);
			args[1] = resolvePath(args[1]);
		}
		return host.fs(method, ...args);
	}

	globalThis.filesystem = {
		itemExists: (p) => fsCall('itemExists', p),
		isDirectory: (p) => fsCall('isDirectory', p),
		createDirectory: (p) => fsCall('createDirectory', p),
		getDirectoryContents: (p) => fsCall('getDirectoryContents', p) || [],
		// Konfabulator's second argument asks for an array of lines rather
		// than one string; Localization.js relies on it to read the
		// .strings files.
		readFile: (p, asLines) => {
			const text = fsCall('readFile', p);
			if (text === undefined || text === null) return asLines ? [] : undefined;
			return asLines ? String(text).split(/\r\n|\r|\n/) : text;
		},
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
			// MainWindow's resize handler measures drag distance in screen
			// coordinates. Synthesised events leave those at zero, which
			// would make every delta zero, so fall back to client
			// coordinates — the difference between two samples is the same
			// either way as long as the window itself hasn't moved.
			const hasScreen = e.screenX !== 0 || e.screenY !== 0;
			ev.screenX = hasScreen ? e.screenX : e.clientX;
			ev.screenY = hasScreen ? e.screenY : e.clientY;
		}
	}

	// --- widget -------------------------------------------------------------

	globalThis.widget = {
		name: 'TimeVault',
		version: host.appVersion ? host.appVersion() : '0.1.0',
		// Konfabulator reported a bare ISO code, matching the Resources/<code>
		// folders. navigator.language is a full tag ("fr-FR"), which would
		// never match, so it's reduced to the language subtag. Falls back to
		// English for anything the widget doesn't ship.
		get locale() {
			const tag = (globalThis.navigator && navigator.language) || 'en';
			const base = String(tag).split('-')[0].toLowerCase();
			return ['en', 'fr', 'tr'].includes(base) ? base : 'en';
		},
		// Konfabulator unpacked a file out of the compressed widget bundle to
		// a temporary location and returned that path. Callers treat the
		// result as a throwaway — Localization.js deletes it right after
		// reading — so this must return a copy, not the asset itself.
		// Returning the real path here silently deleted the shipped
		// Localizable.strings files.
		extractFile: (p) => (host.extractFile ? host.extractFile(String(p)) : p),
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

	// Konfabulator's script loader. Load order is handled by the script tags
	// in index.html, so this is a no-op — but it must exist, because both
	// Main.js's own includeFile() wrapper and Widgui's usingControl() call
	// through to it.
	globalThis.include = function include() {};

	// Main.js defines its own includeFile() wrapper, but RoundButton.js and
	// FlashingButton.js call includeFile() at load time — and in the port they
	// load before Main.js. Konfabulator had no such ordering problem because
	// includeFile() pulled files in on demand. Providing it up front is
	// harmless: Main.js's definition simply replaces this one.
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
