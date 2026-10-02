// Loads the real index.html and reports whatever goes wrong, in order.
//
// This is the "does the ported widget boot?" probe. It's expected to fail
// repeatedly while the shim is filled in; the point is a precise first error
// each time rather than a blank window.
//
//   node_modules/.../Electron test/boot-check.js

'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const host = require('../src/host');
const sqlHost = require('../src/sql-host');

app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
	host.register();
	sqlHost.register();

	const win = new BrowserWindow({
		show: false,
		width: 460,
		height: 420,
		webPreferences: {
			preload: path.join(__dirname, '..', 'src', 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	const messages = [];
	win.webContents.on('console-message', (e) => {
		messages.push({ level: e.level, text: e.message, line: e.lineNumber, source: e.sourceId });
	});
	win.webContents.on('did-fail-load', (_e, code, desc, url) => {
		messages.push({ level: 'error', text: `did-fail-load ${code} ${desc} ${url}` });
	});

	await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
	// Give deferred work (image loads, timers) a chance to throw too.
	await new Promise((r) => setTimeout(r, 2000));

	const state = JSON.parse(await win.webContents.executeJavaScript(`JSON.stringify((() => {
		const stage = document.getElementById('stage');
		const globals = ['Main', 'MainWindow', 'MainDrawer', 'Widgui', 'EventDatabase', 'Puppeteer'];
		return {
			stageChildren: stage ? stage.children.length : -1,
			domNodes: document.querySelectorAll('#stage *').length,
			images: document.querySelectorAll('#stage img').length,
			defined: globals.filter((g) => typeof window[g] !== 'undefined'),
			missing: globals.filter((g) => typeof window[g] === 'undefined'),
		};
	})())`));

	const errors = messages.filter((m) => m.level === 'error');
	const warnings = messages.filter((m) => m.level === 'warning');

	console.log('=== errors ===');
	if (errors.length === 0) console.log('  (none)');
	for (const e of errors.slice(0, 12)) {
		const where = e.source ? ` [${path.basename(e.source)}:${e.line}]` : '';
		console.log(`  ${e.text}${where}`);
	}
	if (errors.length > 12) console.log(`  ... and ${errors.length - 12} more`);

	if (warnings.length) {
		console.log('\n=== warnings ===');
		for (const w of warnings.slice(0, 6)) console.log(`  ${w.text}`);
	}

	console.log('\n=== state ===');
	console.log(`  globals defined: ${state.defined.join(', ') || '(none)'}`);
	console.log(`  globals missing: ${state.missing.join(', ') || '(none)'}`);
	console.log(`  #stage children: ${state.stageChildren}, descendants: ${state.domNodes}, images: ${state.images}`);

	app.exit(errors.length === 0 ? 0 : 1);
});
