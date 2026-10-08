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
const windowHost = require('./window-host');

// Held so the app can wait for a sync started during shutdown.
let pendingQuitSync = null;

const TOKEN_FILE = () => path.join(app.getPath('userData'), 'joplin-token.json');

function loadToken() {
	try {
		const data = JSON.parse(fs.readFileSync(TOKEN_FILE(), 'utf8'));
		return {
			token: data.token || null,
			port: data.port || null,
			folderId: data.folderId || null,
		};
	} catch {
		return { token: null, port: null, folderId: null };
	}
}

// Merges rather than overwrites: the token and the notebook id are written
// by different code paths, and a plain rewrite would drop whichever wasn't
// being set at the time.
function saveTokenData(patch) {
	try {
		const next = { ...loadToken(), ...patch };
		fs.mkdirSync(path.dirname(TOKEN_FILE()), { recursive: true });
		fs.writeFileSync(TOKEN_FILE(), JSON.stringify(next, null, '\t'), 'utf8');
		// The token grants full access to the user's notes.
		fs.chmodSync(TOKEN_FILE(), 0o600);
	} catch (e) {
		console.error('[joplin] could not save the token file:', e.message);
	}
}

function saveToken(token, port) {
	saveTokenData({ token, port });
}

// The notebook the sync owns, remembered by id so it survives a rename and
// can't be confused with another notebook of the same name.
function loadFolderId() {
	return loadToken().folderId;
}

function saveFolderId(folderId) {
	saveTokenData({ folderId });
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

// When the last attempt was abandoned, and how long to leave it before
// asking again. Without this a rejected request would be re-raised on the
// very next change, which with a per-change sync means constantly.
let lastAuthAttempt = 0;
const AUTH_RETRY_MS = 5 * 60 * 1000;

// Lets "Forget Joplin Authorisation" ask again straight away rather than
// waiting out the cooldown.
function resetAuthBackoff() {
	lastAuthAttempt = 0;
}

// Connects, authorising if there's no usable token yet. Returns a ready
// client, or null if that isn't possible right now.
//
// Silent throughout: Joplin not running, or authorisation not yet granted,
// are ordinary states for a set-and-forget sync, not errors to report. The
// only interface is Joplin's own prompt, which appears inside the Joplin
// window reading "The Web Clipper needs your authorisation to access your
// data.". Nothing is shown from here, so there is no dialog to cover it.
async function connect(parentWindow) {
	const stored = loadToken();
	const client = new JoplinClient(stored.port, stored.token);

	if (!await client.connect()) return null;

	const valid = await client.tokenIsValid();

	if (valid === true) {
		// The port can change between runs, so keep the stored copy current.
		if (stored.port !== client.port) saveToken(client.token, client.port);
		return client;
	}

	// Couldn't tell — Joplin was busy, restarting, or didn't answer in time.
	// Skipping is right: the token is probably fine, and asking for a new one
	// would pop Joplin's authorisation prompt for no reason. The next sync
	// tries again.
	if (valid === null) {
		console.warn('[joplin] could not verify the stored token; skipping this sync');
		return null;
	}

	// Any sync that finds no usable token asks for one — including the
	// automatic ones. There used to be an `interactive` gate here, which made
	// the feature impossible to start: the only triggers are automatic, so
	// they all skipped, and nothing ever requested authorisation. Asking is
	// safe because it costs no interface of ours; Joplin shows its own prompt
	// and everything else stays silent.
	if (authInFlight) return authInFlight;

	// Don't re-raise a prompt that was just declined or ignored.
	if (Date.now() - lastAuthAttempt < AUTH_RETRY_MS) return null;
	lastAuthAttempt = Date.now();

	authInFlight = (async () => {
		// Dispatches the request into Joplin, which shows its prompt.
		const authToken = await client.requestAuth();
		console.log('[joplin] asked Joplin on port ' + client.port + ' for authorisation — '
			+ 'accept the request in the Joplin window');

		// Drop always-on-top for the duration: the widget would otherwise
		// float above Joplin's window and hide the prompt inside it.
		const wasAlwaysOnTop = parentWindow && !parentWindow.isDestroyed()
			&& parentWindow.isAlwaysOnTop();
		if (wasAlwaysOnTop) windowHost.setAlwaysOnTop(parentWindow, false);

		try {
			const token = await client.waitForAuth(authToken, { timeoutMs: 180000 });
			if (!token) {
				console.warn('[joplin] authorisation was not granted; will try again later');
				return null; // rejected, superseded, or never answered
			}
			saveToken(token, client.port);
			lastAuthAttempt = 0;
			console.log('[joplin] authorised');
			return client;
		} catch (e) {
			// A timeout is not a failure worth reporting: the prompt is still
			// sitting in Joplin, and the next sync will ask again.
			console.warn('[joplin] authorisation did not complete:', e.message);
			return null;
		} finally {
			// Restored through window-host so the original window level comes
			// back; setAlwaysOnTop(true) alone would quietly downgrade it to
			// floating-within-the-app.
			if (wasAlwaysOnTop && parentWindow && !parentWindow.isDestroyed()) {
				windowHost.setAlwaysOnTop(parentWindow, true);
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

// Syncs if it can, and says nothing either way.
//
// Every sync behaves identically, including authorising when there's no
// usable token: there used to be an `interactive` distinction, but since the
// only triggers are automatic it meant none of them could ever authorise, and
// the feature was impossible to start. Joplin closed, or authorisation not
// yet granted, are ordinary states that fix themselves on a later attempt.
// Only one sync at a time.
//
// Three triggers can overlap — a change, the startup sync, and the one on
// quit — and each used to look for the notebook, find nothing, and create
// one. That is how duplicate "Time Vault" notebooks appeared. A concurrent
// caller now joins the run already in progress rather than starting another.
let syncInFlight = null;

async function runSync(parentWindow) {
	if (syncInFlight) return syncInFlight;

	syncInFlight = (async () => {
		const client = await connect(parentWindow);
		if (!client) return null;

		const dbPath = databasePath();
		if (!fs.existsSync(dbPath)) return null;

		return joplinSync.sync(client, dbPath, {
			// Remembered across runs, so the notebook is found by id even if
			// it has been renamed or moved in Joplin.
			folderId: loadFolderId(),
			onFolder: (id) => { if (id !== loadFolderId()) saveFolderId(id); },
		});
	})().finally(() => { syncInFlight = null; });

	return syncInFlight;
}

function register() {
	ipcMain.handle('joplin:sync', async (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		try {
			return { ok: true, result: await runSync(win) };
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
		pendingQuitSync = runSync(null)
			.catch((e) => console.warn('[joplin] sync on quit failed:', e.message));
	});

	ipcMain.handle('joplin:forget', () => {
		forgetToken();
		// Clear the cooldown too, so the next sync asks again immediately
		// rather than after it expires — forgetting the token is a request to
		// start over.
		resetAuthBackoff();
		return true;
	});

	ipcMain.handle('joplin:status', async () => {
		const stored = loadToken();
		const client = new JoplinClient(stored.port, stored.token);
		const running = await client.connect();
		return {
			running,
			port: client.port,
			// tokenIsValid returns null when it couldn't tell; report that as
			// not-authorised rather than letting null leak to the renderer.
			authorised: running ? (await client.tokenIsValid()) === true : false,
		};
	});
}

const quitSyncPromise = () => pendingQuitSync;

module.exports = { register, runSync, connect, quitSyncPromise, loadToken, saveToken, forgetToken, databasePath };
