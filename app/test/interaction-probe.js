// Drives the booted widget the way a user would — toggles the event timer,
// waits, checks the clock advanced and the event was written to the database
// — so "it renders" can be distinguished from "it works".

'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const TEST_USER_DATA = path.join(app.getPath('temp'), 'timevault-interaction');
fs.rmSync(TEST_USER_DATA, { recursive: true, force: true });
app.setPath('userData', TEST_USER_DATA);

const host = require('../src/host');
const sqlHost = require('../src/sql-host');
const formHost = require('../src/form-host');
const windowHost = require('../src/window-host');

app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
	host.register();
	sqlHost.register();
	windowHost.register();

	// Don't register the real form host: starting a timer with no project
	// opens a modal, and nothing here could dismiss it. Auto-answer instead,
	// supplying a project name as a user would.
	const { ipcMain } = require('electron');
	ipcMain.on('host:form', (event, items) => {
		event.returnValue = items.map((it, i) => (i === 0 ? 'Probe project' : String(it.defaultValue ?? '')));
	});
	ipcMain.on('host:alert', (event) => { event.returnValue = 0; });

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

	const errors = [];
	win.webContents.on('console-message', (e) => {
		if (e.level === 'error') errors.push(e.message);
	});

	await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
	// The widget code is loaded asynchronously now (the skin has to decode
	// first), so wait for the ready signal rather than a fixed delay.
	await win.webContents.executeJavaScript(`new Promise((resolve) => {
		if (window.KON_WIDGET_READY) return resolve(true);
		document.addEventListener('kon-widget-ready', () => resolve(true), { once: true });
		setTimeout(() => resolve(false), 15000);
	})`);
	await new Promise((r) => setTimeout(r, 800));

	// Evaluate defensively: a throwing expression would otherwise leave the
	// promise rejected and hang the probe with no output.
	const read = async (label, expr) => {
		try {
			const v = await win.webContents.executeJavaScript(
				`(() => { try { return String(${expr}); } catch (e) { return 'ERR: ' + e.message; } })()`,
			);
			console.log(`  ${label}: ${v}`);
			return v;
		} catch (e) {
			console.log(`  ${label}: EVAL FAILED ${e.message}`);
			return null;
		}
	};

	console.log('=== after boot ===');
	await read('projects loaded', 'gDatabase.projects.length');
	await read('events loaded', 'gDatabase.events.length');
	await read('clock', 'gMainWindow.eventTimeText.data');
	await read('project name', 'gMainWindow.projectNameText.data');
	await read('event in progress', 'gMainWindow.projectEvent == undefined ? "none" : "yes"');

	console.log('\n=== start the timer ===');
	await read('toggle', 'gMainWindow.toggleEventTimer(), "called"');
	await new Promise((r) => setTimeout(r, 3000));
	await read('event in progress', 'gMainWindow.projectEvent == undefined ? "none" : "yes"');
	await read('clock', 'gMainWindow.eventTimeText.data');

	console.log('\n=== stop the timer ===');
	await read('toggle', 'gMainWindow.toggleEventTimer(), "called"');
	await new Promise((r) => setTimeout(r, 1500));
	await read('event in progress', 'gMainWindow.projectEvent == undefined ? "none" : "yes"');
	await read('events in memory', 'gDatabase.events.length');
	// EventDatabase opens and closes around each operation, so the handle has
	// to be reopened before querying it directly.
	await read('events on disk', `(() => {
		gDatabase.db.open();
		const rows = gDatabase.db.query("SELECT COUNT(*) AS n FROM Events");
		const r = rows.current();
		const n = r ? r.n : -1;
		rows.dispose();
		gDatabase.db.close();
		return n;
	})()`);
	await read('last event on disk', `(() => {
		gDatabase.db.open();
		const rows = gDatabase.db.query("SELECT ProjectID, StartDate, EndDate FROM Events ORDER BY ID DESC LIMIT 1");
		const r = rows.current();
		if (!r) { rows.dispose(); gDatabase.db.close(); return "no rows"; }
		const d = (Number(r.EndDate) - Number(r.StartDate)) / 1000;
		rows.dispose();
		gDatabase.db.close();
		return "project=" + r.ProjectID + " duration=" + d.toFixed(1) + "s";
	})()`);
	await read('projects on disk', `(() => {
		gDatabase.db.open();
		const rows = gDatabase.db.query("SELECT ID, Name FROM Projects");
		const out = [];
		while (rows.current()) { out.push(rows.current().Name); rows.next(); }
		rows.dispose();
		gDatabase.db.close();
		return out.join(", ") || "(none)";
	})()`);

	console.log(`\n=== errors (${errors.length}) ===`);
	for (const e of errors.slice(0, 8)) console.log('  ' + e);

	app.exit(0);
});
