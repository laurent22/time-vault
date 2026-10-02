// Main-process side of the Joplin sync: connecting, authorising, and
// running the sync on demand.
//
// The API token is kept in the app's own data folder rather than in
// preferences.json, which is rewritten wholesale by the widget and would be
// an odd place for a credential.

'use strict';

const { app, ipcMain, dialog, BrowserWindow } = require('electron');
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

// Connects, authorising if there's no usable token yet. Returns a ready
// client, or null if the user declined or Joplin isn't running.
async function connect(parentWindow, { interactive = true } = {}) {
	const stored = loadToken();
	const client = new JoplinClient(stored.port, stored.token);

	if (!await client.connect()) {
		if (interactive) {
			dialog.showMessageBoxSync(parentWindow || undefined, {
				type: 'warning',
				message: 'Joplin was not found.',
				detail: 'Start Joplin and make sure the Web Clipper service is enabled '
					+ '(Joplin → Settings → Web Clipper), then try again.',
				buttons: ['OK'],
			});
		}
		return null;
	}

	if (await client.tokenIsValid()) {
		// The port can change between runs, so keep the stored copy current.
		if (stored.port !== client.port) saveToken(client.token, client.port);
		return client;
	}

	// A background sync won't interrupt to ask for authorisation: it wasn't
	// asked for at this moment. Switching the setting on is what prompts, and
	// the menu commands prompt on demand.
	if (!interactive) return null;

	// No token, or it's been revoked: ask for one. This dispatches the
	// request into Joplin, which renders a modal *inside its own window*
	// reading "The Web Clipper needs your authorisation to access your data."
	// — not a native dialog, so it can be hidden behind other windows.
	const authToken = await client.requestAuth();

	// Get out of the way so that modal is reachable. The widget is frameless
	// and often always-on-top, which puts it above Joplin; a modal sheet of
	// our own would sit on top of everything and block this process while
	// Joplin waits for an answer that can't be given. That combination is
	// exactly why the prompt looked like it never appeared.
	const wasAlwaysOnTop = parentWindow && !parentWindow.isDestroyed()
		&& parentWindow.isAlwaysOnTop();
	if (wasAlwaysOnTop) parentWindow.setAlwaysOnTop(false);

	// Polling starts before anything is shown, so accepting in Joplin is
	// noticed whether or not the notice below is dismissed first.
	const pending = client.waitForAuth(authToken, { timeoutMs: 180000 });

	// Non-blocking: showMessageBox (not ...Sync) lets this process keep
	// polling, and no parent window means it doesn't become a sheet attached
	// to — and stacked above — the widget. There's no API to dismiss it
	// programmatically, so it says to close it rather than promising it will
	// go by itself.
	dialog.showMessageBox({
		type: 'info',
		message: 'Authorise TimeVault in Joplin',
		detail: 'Switch to Joplin and choose "Grant authorisation".\n\n'
			+ 'The request appears inside the Joplin window rather than as a '
			+ 'separate alert, so bring Joplin to the front if you can\'t see '
			+ 'it.\n\nYou can close this notice; TimeVault keeps waiting for '
			+ 'about three minutes either way.',
		buttons: ['OK'],
		defaultId: 0,
		cancelId: 0,
	});

	let token = null;
	let timedOut = false;
	try {
		token = await pending;
	} catch {
		timedOut = true;
	} finally {
		if (wasAlwaysOnTop && parentWindow && !parentWindow.isDestroyed()) {
			parentWindow.setAlwaysOnTop(true);
		}
	}

	if (!token) {
		dialog.showMessageBoxSync(parentWindow || undefined, {
			type: 'warning',
			message: timedOut
				? 'TimeVault is still waiting for authorisation.'
				: 'Joplin refused the request.',
			detail: timedOut
				? 'No answer came back from Joplin, so nothing was synced. '
					+ 'Switching the setting off and on again will ask once more.'
				: 'TimeVault was not granted access, so nothing was synced.',
			buttons: ['OK'],
		});
		return null;
	}

	saveToken(token, client.port);
	return client;
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

async function runSync(parentWindow, { interactive = true } = {}) {
	const client = await connect(parentWindow, { interactive });
	if (!client) return null;

	const dbPath = databasePath();
	if (!fs.existsSync(dbPath)) {
		if (interactive) {
			dialog.showMessageBoxSync(parentWindow || undefined, {
				type: 'warning',
				message: 'No TimeVault data to sync yet.',
				detail: `Expected a database at:\n${dbPath}`,
				buttons: ['OK'],
			});
		}
		return null;
	}

	const result = await joplinSync.sync(client, dbPath);

	if (interactive) {
		dialog.showMessageBoxSync(parentWindow || undefined, {
			type: 'info',
			message: 'Synced to Joplin.',
			detail: `${result.projects} project${result.projects === 1 ? '' : 's'} and `
				+ `${result.events} entr${result.events === 1 ? 'y' : 'ies'} written to the `
				+ `"${result.folder}" notebook.\n\n`
				+ 'This is a one-way sync: those notes are rewritten each time, so any '
				+ 'changes made in Joplin will be lost.',
			buttons: ['OK'],
		});
	}

	return result;
}

function register() {
	ipcMain.handle('joplin:sync', async (event, options = {}) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		const interactive = options.interactive !== false;
		try {
			return { ok: true, result: await runSync(win, { interactive }) };
		} catch (e) {
			// A background sync fails silently: it was never asked for at
			// this moment, so a dialog would just be an interruption.
			if (interactive) {
				dialog.showMessageBoxSync(win || undefined, {
					type: 'error',
					message: 'The Joplin sync failed.',
					detail: e.message,
					buttons: ['OK'],
				});
			} else {
				console.warn('[joplin] background sync failed:', e.message);
			}
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
