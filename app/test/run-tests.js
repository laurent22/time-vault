// Headless test runner. Boots Electron, loads the shim and the test file in a
// renderer (the shim needs a real DOM), prints results, exits non-zero on
// failure.
//
//   npm test

'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const host = require('../src/host');

app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
	// The shim talks to the same main-process host the real app uses, so the
	// filesystem and preference tests exercise the actual implementation.
	host.register();

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

	await win.loadFile(path.join(__dirname, 'harness.html'));

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
