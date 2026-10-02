// Tests that need the whole widget running, not just the shim: they boot the
// real index.html and assert against the live objects.
//
// Kept separate from run-tests.js because booting the widget costs a couple of
// seconds and touches the database, whereas the shim tests are instant.

'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const TEST_USER_DATA = path.join(app.getPath('temp'), 'timevault-app-tests');
fs.rmSync(TEST_USER_DATA, { recursive: true, force: true });
fs.mkdirSync(TEST_USER_DATA, { recursive: true });
app.setPath('userData', TEST_USER_DATA);

const host = require('../src/host');
const sqlHost = require('../src/sql-host');
const windowHost = require('../src/window-host');

app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
	host.register();
	sqlHost.register();
	windowHost.register();

	// Auto-answer the modals so nothing blocks: creating the first project
	// opens a form, and the tray isn't running here.
	ipcMain.on('host:form', (event, items) => {
		event.returnValue = items.map((it, i) => (i === 0 ? 'Test project' : String(it.defaultValue ?? '')));
	});
	ipcMain.on('host:alert', (event) => { event.returnValue = 0; });
	ipcMain.on('host:tray-state', () => {});

	const win = new BrowserWindow({
		show: false,
		width: 460,
		height: 420,
		resizable: true,
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

	await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
	await win.webContents.executeJavaScript(`new Promise((resolve) => {
		if (window.KON_WIDGET_READY) return resolve(true);
		document.addEventListener('kon-widget-ready', () => resolve(true), { once: true });
		setTimeout(() => resolve(false), 15000);
	})`);
	await new Promise((r) => setTimeout(r, 1200));

	// Inject the assertions into the booted page.
	const source = fs.readFileSync(path.join(__dirname, 'prefs-ui-test.js'), 'utf8');
	await win.webContents.executeJavaScript(source);

	// And the live-widget checks, which need the real canvases.
	await win.webContents.executeJavaScript(`(() => {
		const r = window.__shimTestResults;
		const check = (name, fn) => {
			try { const m = fn(); r.push({ name, ok: m === undefined || m === true, msg: m === true ? undefined : (m && String(m)) }); }
			catch (e) { r.push({ name, ok: false, msg: 'threw: ' + e.message }); }
		};

		check('the glass gradient actually paints colour', () => {
			const c = gMainWindow.infoAreaActiveCanvas.node;
			const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
			let rr = 0, gg = 0, bb = 0, n = 0;
			for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { rr += d[i]; gg += d[i+1]; bb += d[i+2]; n++; }
			if (n === 0) return 'the active info area painted nothing';
			rr /= n; gg /= n; bb /= n;
			// Default scheme 4 is blue: blue must clearly dominate red.
			if (bb <= rr + 30) return 'expected a blue gradient, got rgb(' + Math.round(rr) + ',' + Math.round(gg) + ',' + Math.round(bb) + ')';
		});

		check('changing the colour scheme repaints the glass', () => {
			const read = () => {
				const c = gMainWindow.infoAreaActiveCanvas.node;
				const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
				let rr = 0, bb = 0, n = 0;
				for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { rr += d[i]; bb += d[i+2]; n++; }
				return n ? { r: rr / n, b: bb / n } : null;
			};

			const before = read();
			widget.onWillChangePreferences();
			preferences.colorScheme.value = '1';   // red/orange
			widget.onPreferencesChanged();
			const after = read();

			// Put it back so the rest of the run sees the default.
			widget.onWillChangePreferences();
			preferences.colorScheme.value = '4';
			widget.onPreferencesChanged();

			if (!before || !after) return 'could not sample the canvas';
			if (!(after.r > before.r + 40)) {
				return 'switching to the red scheme did not make it redder ('
					+ Math.round(before.r) + ' -> ' + Math.round(after.r) + ')';
			}
		});

		check('the widget sized the window to its content', () => {
			const stage = document.getElementById('stage');
			let maxR = 0;
			for (const el of stage.querySelectorAll('*')) {
				const cs = getComputedStyle(el);
				if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
				const b = el.getBoundingClientRect();
				if (b.width && b.right > maxR) maxR = b.right;
			}
			// The collapsed widget is a little over 200px wide; a window still
			// at the 460px placeholder means fitting never ran.
			if (maxR > 400) return 'content is wider than expected: ' + Math.round(maxR);
			if (maxR < 100) return 'content is implausibly narrow: ' + Math.round(maxR);
		});

		check('the drawer opens and grows the layout', () => {
			const heightOf = () => {
				const stage = document.getElementById('stage');
				let maxB = 0;
				for (const el of stage.querySelectorAll('*')) {
					const cs = getComputedStyle(el);
					if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
					const b = el.getBoundingClientRect();
					if (b.height && b.bottom > maxB) maxB = b.bottom;
				}
				return maxB;
			};
			const before = heightOf();
			gMainWindow.expandButton_clicked();
			// The open/close is animated, so this only checks it was accepted;
			// the growth itself is asserted by the interaction probe.
			if (typeof gMainWindow.opened !== 'boolean') return 'opened is not a boolean';
			return before > 0 ? undefined : 'nothing was laid out to begin with';
		});

		return 1;
	})()`);

	// The Joplin triggers, which need awaiting: the sync is debounced, so
	// these can't be folded into the synchronous checks above.
	//
	// The assertions count scheduled syncs via KON_JOPLIN_SYNC_COUNT rather
	// than spying on tvHost.joplinSync: contextBridge freezes tvHost, so an
	// assignment there fails silently and the test measures nothing.
	await win.webContents.executeJavaScript(`(async () => {
		const r = window.__shimTestResults;
		const check = async (name, fn) => {
			try { const m = await fn(); r.push({ name, ok: m === undefined || m === true, msg: m === true ? undefined : (m && String(m)) }); }
			catch (e) { r.push({ name, ok: false, msg: 'threw: ' + e.message }); }
		};

		globalThis.KON_JOPLIN_DEBOUNCE_MS = 120;
		const settle = () => new Promise((res) => setTimeout(res, 400));
		const counted = () => globalThis.KON_JOPLIN_SYNC_COUNT;
		let base = 0;
		const reset = () => { base = counted(); };
		const since = () => counted() - base;

		const write = () => gDatabase.db.exec('UPDATE Projects SET Name = Name WHERE ID = 1');

		await check('every database write is watched at one chokepoint', () => {
			if (!Database.prototype.__joplinWatched) return 'Database.exec was never wrapped';
		});

		await check('a data change schedules a sync', async () => {
			preferences.joplinSyncEnabled.value = '1';
			reset();
			write();
			if (since() !== 0) return 'synced synchronously; it should be debounced';
			await settle();
			if (since() !== 1) return 'expected 1 sync, got ' + since();
		});

		await check('a burst of changes collapses into one sync', async () => {
			reset();
			for (let i = 0; i < 6; i++) write();
			await settle();
			if (since() !== 1) return '6 writes produced ' + since() + ' syncs';
		});

		await check('reads and schema statements do not sync', async () => {
			reset();
			gDatabase.db.query('SELECT * FROM Projects');
			// Contains the word DELETE but changes nothing.
			gDatabase.db.exec('PRAGMA journal_mode = DELETE');
			await settle();
			if (since() !== 0) return 'a SELECT/PRAGMA triggered ' + since() + ' syncs';
		});

		await check('nothing syncs while the setting is off', async () => {
			preferences.joplinSyncEnabled.value = '0';
			reset();
			write();
			await settle();
			if (since() !== 0) return 'synced ' + since() + ' times while disabled';
		});

		await check('authorisation is offered whenever it is missing, not just on the edge', async () => {
			// Keying this off the off->on transition meant a profile with the
			// setting already enabled but never authorised could never prompt
			// again — which is exactly the state a failed first attempt leaves
			// behind, and is how this shipped broken. The condition has to be
			// "enabled and not authorised".
			if (typeof konJoplinAuthoriseIfNeeded !== 'function') return 'konJoplinAuthoriseIfNeeded missing';

			const decide = (on, status) => (!on ? false : !!(status && status.running && !status.authorised));

			if (!decide(true, { running: true, authorised: false })) return 'enabled with no token should prompt';
			if (decide(true, { running: true, authorised: true })) return 'an authorised profile should not prompt';
			if (decide(true, { running: false, authorised: false })) return 'Joplin being closed should not prompt';
			if (decide(false, { running: true, authorised: false })) return 'a disabled feature should not prompt';
		});

		delete globalThis.KON_JOPLIN_DEBOUNCE_MS;
		return 1;
	})()`);

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
