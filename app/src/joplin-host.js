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

	if (!interactive) return null;

	// No token, or it's been revoked: ask for one.
	const authToken = await client.requestAuth();

	const choice = dialog.showMessageBoxSync(parentWindow || undefined, {
		type: 'info',
		message: 'Authorise TimeVault in Joplin',
		detail: 'Joplin is asking whether to grant TimeVault access. Switch to '
			+ 'Joplin and accept the request, then come back here.',
		buttons: ['Waiting…', 'Cancel'],
		defaultId: 0,
		cancelId: 1,
	});
	if (choice === 1) return null;

	const token = await client.waitForAuth(authToken, { timeoutMs: 180000 });
	if (!token) {
		dialog.showMessageBoxSync(parentWindow || undefined, {
			type: 'warning',
			message: 'Joplin refused the request.',
			detail: 'TimeVault was not granted access, so nothing was synced.',
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
	ipcMain.handle('joplin:sync', async (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		try {
			return { ok: true, result: await runSync(win) };
		} catch (e) {
			dialog.showMessageBoxSync(win || undefined, {
				type: 'error',
				message: 'The Joplin sync failed.',
				detail: e.message,
				buttons: ['OK'],
			});
			return { ok: false, error: e.message };
		}
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

module.exports = { register, runSync, connect, loadToken, saveToken, forgetToken, databasePath };
