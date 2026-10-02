// Main-process side of the Joplin sync: connecting, authorising, and
// running the sync on demand.
//
// The API token is kept in the app's own data folder rather than in
// preferences.json, which is rewritten wholesale by the widget and would be
// an odd place for a credential.

'use strict';

// No `dialog`: the sync is deliberately silent. The only interface is
// Joplin's own authorisation prompt.
const { app, ipcMain, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const { JoplinClient } = require('./joplin-client');
const joplinSync = require('./joplin-sync');

// Held so the app can wait for a sync started during shutdown.
let pendingQuitSync = null;

const TOKEN_FILE = () => path.join(app.getPath('userData'), 'joplin-token.json');

function loadToken() {
	try {
		const data = JSON.parse(fs.readFileSync(TOKEN_FILE(), 'utf8'));
		return { token: data.token || null, port: data.port || null };
	} catch {
		return { token: null, port: null };
	}
}

function saveToken(token, port) {
	try {
		fs.mkdirSync(path.dirname(TOKEN_FILE()), { recursive: true });
		fs.writeFileSync(TOKEN_FILE(), JSON.stringify({ token, port }, null, '\t'), 'utf8');
		// The token grants full access to the user's notes.
		fs.chmodSync(TOKEN_FILE(), 0o600);
	} catch (e) {
		console.error('[joplin] could not save the token:', e.message);
	}
}

function forgetToken() {
	try { fs.rmSync(TOKEN_FILE(), { force: true }); } catch { /* nothing to do */ }
}

// Only ever one authorisation in flight.
//
// POST /auth replaces Joplin's stored auth token, so a second request
// invalidates the first: /auth/check then answers "Invalid auth token", the
// wait rejects immediately, and the whole attempt collapses about a second
// after starting. Two triggers arriving together is enough to cause it.
let authInFlight = null;

// Connects, authorising if there's no usable token yet. Returns a ready
// client, or null if that isn't possible right now.
//
// Silent throughout: Joplin not running, or authorisation not yet granted,
// are ordinary states for a set-and-forget sync, not errors to report. The
// only interface is Joplin's own prompt, which appears inside the Joplin
// window reading "The Web Clipper needs your authorisation to access your
// data.". Nothing is shown from here, so there is no dialog to cover it.
async function connect(parentWindow, { interactive = true } = {}) {
	const stored = loadToken();
	const client = new JoplinClient(stored.port, stored.token);

	if (!await client.connect()) return null;

	if (await client.tokenIsValid()) {
		// The port can change between runs, so keep the stored copy current.
		if (stored.port !== client.port) saveToken(client.token, client.port);
		return client;
	}

	// Only an explicitly requested sync asks for authorisation. A background
	// one skips, and the next trigger tries again.
	if (!interactive) return null;

	if (authInFlight) return authInFlight;

	authInFlight = (async () => {
		// Dispatches the request into Joplin, which shows its prompt.
		const authToken = await client.requestAuth();

		// Drop always-on-top for the duration: the widget would otherwise
		// float above Joplin's window and hide the prompt inside it.
		const wasAlwaysOnTop = parentWindow && !parentWindow.isDestroyed()
			&& parentWindow.isAlwaysOnTop();
		if (wasAlwaysOnTop) parentWindow.setAlwaysOnTop(false);

		try {
			const token = await client.waitForAuth(authToken, { timeoutMs: 180000 });
			if (!token) return null; // rejected, or never answered
			saveToken(token, client.port);
			return client;
		} catch (e) {
			// A timeout is not a failure worth reporting: the prompt is still
			// sitting in Joplin, and the next sync will ask again.
			console.warn('[joplin] authorisation did not complete:', e.message);
			return null;
		} finally {
			if (wasAlwaysOnTop && parentWindow && !parentWindow.isDestroyed()) {
				parentWindow.setAlwaysOnTop(true);
			}
			authInFlight = null;
		}
	})();

	return authInFlight;
}

// The database the widget is actually using, which the user can move in
// preferences.
function databasePath() {
	try {
		const prefs = JSON.parse(
			fs.readFileSync(path.join(app.getPath('userData'), 'preferences.json'), 'utf8'));
		if (prefs.dataFolder && prefs.dataFolder !== 'setme') return prefs.dataFolder;
	} catch {
		// Falls through to the default below.
	}
	return path.join(app.getPath('userData'), 'Events.db3');
}

// Syncs if it can, and says nothing either way. `interactive` only decides
// whether authorisation may be requested, not whether anything is displayed:
// a set-and-forget sync that announces each success is worse than one that
// stays quiet, and the failures here — Joplin closed, not yet authorised —
// are all states that fix themselves on the next attempt.
async function runSync(parentWindow, { interactive = true } = {}) {
	const client = await connect(parentWindow, { interactive });
	if (!client) return null;

	const dbPath = databasePath();
	if (!fs.existsSync(dbPath)) return null;

	return joplinSync.sync(client, dbPath);
}

function register() {
	ipcMain.handle('joplin:sync', async (event, options = {}) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		const interactive = options.interactive !== false;
		try {
			return { ok: true, result: await runSync(win, { interactive }) };
		} catch (e) {
			// Logged, never shown. A sync nobody asked to watch shouldn't
			// interrupt to report that Joplin was closed.
			console.warn('[joplin] sync failed:', e.message);
			return { ok: false, error: e.message };
		}
	});

	// Fired as the window unloads. Nothing can be awaited at that point, so
	// this runs on after the renderer has gone and the app waits for it.
	ipcMain.on('joplin:sync-on-quit', () => {
		pendingQuitSync = runSync(null, { interactive: false })
			.catch((e) => console.warn('[joplin] sync on quit failed:', e.message));
	});

	ipcMain.handle('joplin:forget', () => {
		forgetToken();
		return true;
	});

	ipcMain.handle('joplin:status', async () => {
		const stored = loadToken();
		const client = new JoplinClient(stored.port, stored.token);
		const running = await client.connect();
		return {
			running,
			port: client.port,
			authorised: running ? await client.tokenIsValid() : false,
		};
	});
}

const quitSyncPromise = () => pendingQuitSync;

module.exports = { register, runSync, connect, quitSyncPromise, loadToken, saveToken, forgetToken, databasePath };
