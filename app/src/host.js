// Main-process implementations of the host capabilities the shim needs:
// preference persistence and synchronous filesystem access.
//
// The filesystem handlers are deliberately synchronous (ipcMain.on with
// event.returnValue) because Konfabulator's filesystem API was synchronous and
// the ported code depends on it — it tests itemExists() and reads in the same
// expression. The call volume is low enough that blocking the renderer briefly
// is not a problem.

'use strict';

const { app, ipcMain, shell, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// Preferences live alongside the database, in the per-user app data folder,
// so that reinstalling or moving the app doesn't lose them.
const DATA_DIR = path.join(app.getPath('userData'));
const PREFS_FILE = path.join(DATA_DIR, 'preferences.json');

function ensureDataDir() {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadPreferences() {
	try {
		return JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8'));
	} catch {
		// Missing or corrupt: fall back to defaults rather than failing to
		// start. A corrupt file gets overwritten on the next save.
		return {};
	}
}

function savePreferences(values) {
	try {
		ensureDataDir();
		// Write via a temp file so an interrupted write can't truncate the
		// existing preferences.
		const tmp = `${PREFS_FILE}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify(values, null, '\t'), 'utf8');
		fs.renameSync(tmp, PREFS_FILE);
	} catch (e) {
		console.error('[host] failed to save preferences:', e.message);
	}
}

// --- filesystem -----------------------------------------------------------
// Each operation returns a value or undefined on failure, matching
// Konfabulator, which reported failure by return value rather than throwing.

const fsOps = {
	itemExists: (p) => fs.existsSync(p),

	isDirectory: (p) => {
		try { return fs.statSync(p).isDirectory(); } catch { return false; }
	},

	createDirectory: (p) => {
		try { fs.mkdirSync(p, { recursive: true }); return true; } catch { return false; }
	},

	getDirectoryContents: (p) => {
		try { return fs.readdirSync(p); } catch { return []; }
	},

	readFile: (p) => {
		try { return fs.readFileSync(p, 'utf8'); } catch { return undefined; }
	},

	writeFile: (p, data) => {
		try {
			fs.mkdirSync(path.dirname(p), { recursive: true });
			fs.writeFileSync(p, String(data), 'utf8');
			return true;
		} catch { return false; }
	},

	remove: (p) => {
		// Never delete shipped assets. The widget calls remove() on paths it
		// believes are temporary extracts, and a resolution bug there once
		// wiped the Localizable.strings files out of the source tree.
		const assets = path.join(__dirname, '..', 'assets');
		const resolved = path.resolve(String(p));
		if (resolved === assets || resolved.startsWith(`${assets}${path.sep}`)) {
			console.warn('[host] refusing to remove a bundled asset:', resolved);
			return false;
		}
		try { fs.rmSync(resolved, { recursive: true, force: true }); return true; } catch { return false; }
	},

	copy: (from, to) => {
		try { fs.copyFileSync(from, to); return true; } catch { return false; }
	},

	reveal: (p) => {
		shell.showItemInFolder(p);
		return true;
	},
};

function register() {
	ipcMain.on('host:fs', (event, method, ...args) => {
		const op = fsOps[method];
		if (!op) {
			console.warn('[host] unknown filesystem method:', method);
			event.returnValue = undefined;
			return;
		}
		event.returnValue = op(...args);
	});

	ipcMain.on('host:load-preferences', (event) => {
		event.returnValue = loadPreferences();
	});

	ipcMain.on('host:save-preferences', (_event, values) => {
		savePreferences(values);
	});

	// Synchronous variant, used on unload so a quit can't drop the last writes.
	ipcMain.on('host:save-preferences-sync', (event, values) => {
		savePreferences(values);
		event.returnValue = true;
	});

	ipcMain.on('host:data-folder', (event) => {
		ensureDataDir();
		event.returnValue = DATA_DIR;
	});

	ipcMain.on('host:work-area', (event) => {
		event.returnValue = screen.getPrimaryDisplay().workArea;
	});

	ipcMain.on('host:app-version', (event) => {
		event.returnValue = app.getVersion();
	});

	// Where the widget's own resources live, for resolving the
	// bundle-relative paths the ported code uses.
	ipcMain.on('host:asset-root', (event) => {
		event.returnValue = path.join(__dirname, '..', 'assets');
	});

	// Konfabulator's widget.extractFile(): unpack a bundle resource to a
	// temporary path and hand that back. Callers own the result and delete
	// it when done, so this must never return the asset itself.
	ipcMain.on('host:extract-file', (event, rel) => {
		const source = path.join(__dirname, '..', 'assets', String(rel).replace(/^Resources\//, ''));
		if (!fs.existsSync(source)) {
			event.returnValue = undefined;
			return;
		}
		try {
			const dir = path.join(DATA_DIR, 'extracted');
			fs.mkdirSync(dir, { recursive: true });
			const target = path.join(dir, `${Date.now()}-${path.basename(source)}`);
			fs.copyFileSync(source, target);
			event.returnValue = target;
		} catch (e) {
			console.error('[host] extractFile failed:', e.message);
			event.returnValue = undefined;
		}
	});

	ipcMain.on('host:open-external', (_event, url) => {
		// Only http(s) and mailto: the widget's one call site is a version
		// check URL, and anything else would be a way to launch arbitrary
		// handlers from page content.
		if (/^(https?|mailto):/i.test(String(url))) shell.openExternal(url);
	});
}

module.exports = { register, DATA_DIR, PREFS_FILE, loadPreferences };
