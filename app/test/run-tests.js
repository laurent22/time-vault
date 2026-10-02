// Headless test runner. Boots Electron, loads the shim and the test file in a
// renderer (the shim needs a real DOM), prints results, exits non-zero on
// failure.
//
//   npm test

'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
// Run against a scratch userData directory so the suite neither reads nor
// clobbers the preferences and database of a real TimeVault install. Must be
// set before anything reads app.getPath('userData'), which is why it comes
// before the host modules are required.
const TEST_USER_DATA = path.join(app.getPath('temp'), 'timevault-tests');
fs.rmSync(TEST_USER_DATA, { recursive: true, force: true });
fs.mkdirSync(TEST_USER_DATA, { recursive: true });
app.setPath('userData', TEST_USER_DATA);

const host = require('../src/host');
const sqlHost = require('../src/sql-host');
const formHost = require('../src/form-host');
const windowHost = require('../src/window-host');

app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
	// The shim talks to the same main-process host the real app uses, so the
	// filesystem and preference tests exercise the actual implementation.
	host.register();
	sqlHost.register();
	windowHost.register();

	// Not formHost: its popupMenu would show a real menu and block the run.
	// Stub it to pick the last item so a test can assert what was chosen.
	const { ipcMain } = require('electron');
	ipcMain.on('host:popup-menu', (event, items) => {
		event.returnValue = items.length ? items.length - 1 : -1;
	});
	ipcMain.on('host:form', (event, items) => {
		event.returnValue = items.map((it) => String(it.defaultValue ?? ''));
	});
	ipcMain.on('host:alert', (event) => { event.returnValue = 0; });

	const win = new BrowserWindow({
		show: false,
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, '..', 'src', 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	const pageErrors = [];
	win.webContents.on('console-message', (e) => {
		if (e.level === 'error') pageErrors.push(e.message);
	});

	// Work on a copy of the fixture: SQLite can write a journal beside the
	// file, and the committed 2007 database should stay pristine.
	const fixtureSrc = path.join(__dirname, 'fixtures', 'Events.db3');
	const fixtureCopy = path.join(app.getPath('userData'), 'test-Events.db3');
	fs.mkdirSync(path.dirname(fixtureCopy), { recursive: true });
	fs.copyFileSync(fixtureSrc, fixtureCopy);

	// Passed as a query parameter so it's available before the page's own
	// scripts run, rather than injected after they've already executed.
	await win.loadFile(path.join(__dirname, 'harness.html'), {
		query: { fixtureDb: fixtureCopy },
	});

	// Serialise in the page: results can reference DOM-adjacent values that
	// aren't structured-cloneable across the IPC boundary.
	const results = JSON.parse(
		await win.webContents.executeJavaScript('JSON.stringify(window.__shimTestResults || [])'),
	);

	let failed = 0;
	for (const r of results) {
		if (r.ok) {
			console.log(`  ok   ${r.name}`);
		} else {
			failed++;
			console.log(`  FAIL ${r.name}`);
			if (r.msg) console.log(`         ${r.msg}`);
		}
	}

	for (const e of pageErrors) {
		failed++;
		console.log(`  FAIL console error: ${e}`);
	}

	console.log(`\n${results.length - failed}/${results.length} passed`);
	app.exit(failed === 0 ? 0 : 1);
});
