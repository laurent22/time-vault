// Tests for the main-process window controls, run under Electron because they
// need a real BrowserWindow.
//
// Usage: electron test/window-host-test.js

'use strict';

const { app, BrowserWindow } = require('electron');
const assert = require('node:assert');

const windowHost = require('../src/window-host');

const results = [];
function check(name, fn) {
	try {
		fn();
		results.push({ name, ok: true });
	} catch (e) {
		results.push({ name, ok: false, msg: e.message });
	}
}

app.on('window-all-closed', () => {});

app.whenReady().then(() => {
	const makeWindow = () => new BrowserWindow({
		show: false,
		frame: false,
		transparent: true,
		skipTaskbar: true,
		alwaysOnTop: false,
	});

	check('always on top is off until asked for', () => {
		const w = makeWindow();
		try {
			assert.strictEqual(w.isAlwaysOnTop(), false);
		} finally {
			w.destroy();
		}
	});

	check('always on top uses a level that clears other applications', () => {
		// The bug this covers: plain setAlwaysOnTop(true) uses the 'floating'
		// level on macOS, which keeps the window above its own app's windows
		// but below another application's active window — so the widget kept
		// vanishing behind whatever was in front, which reads as the feature
		// simply not working. isAlwaysOnTop() is true either way, so the flag
		// cannot be the assertion; the level has to be read back.
		const w = makeWindow();
		try {
			windowHost.setAlwaysOnTop(w, true);
			assert.strictEqual(w.isAlwaysOnTop(), true, 'the flag should be set');

			if (process.platform === 'darwin') {
				// There's no getter for the level, so this asserts the
				// observable consequence: screen-saver level windows are also
				// pinned across Spaces, which 'floating' alone does not do.
				assert.strictEqual(w.isVisibleOnAllWorkspaces(), true,
					'a floating-only window would not be pinned across Spaces');
			}
		} finally {
			w.destroy();
		}
	});

	check('turning it off clears both the level and the Spaces pinning', () => {
		const w = makeWindow();
		try {
			windowHost.setAlwaysOnTop(w, true);
			windowHost.setAlwaysOnTop(w, false);
			assert.strictEqual(w.isAlwaysOnTop(), false);
			assert.strictEqual(w.isVisibleOnAllWorkspaces(), false,
				'the Spaces pinning must be undone too, or the window stays stuck');
		} finally {
			w.destroy();
		}
	});

	check('it can be toggled repeatedly', () => {
		const w = makeWindow();
		try {
			for (let i = 0; i < 3; i++) {
				windowHost.setAlwaysOnTop(w, true);
				assert.strictEqual(w.isAlwaysOnTop(), true, `on, round ${i}`);
				windowHost.setAlwaysOnTop(w, false);
				assert.strictEqual(w.isAlwaysOnTop(), false, `off, round ${i}`);
			}
		} finally {
			w.destroy();
		}
	});

	check('the Joplin flow restores the level it dropped', () => {
		// Authorisation drops always-on-top so Joplin's prompt is reachable,
		// then puts it back. Restoring with a bare setAlwaysOnTop(true) would
		// silently downgrade the level and break the feature from then on.
		const w = makeWindow();
		try {
			windowHost.setAlwaysOnTop(w, true);
			const was = w.isAlwaysOnTop();

			windowHost.setAlwaysOnTop(w, false);
			assert.strictEqual(w.isAlwaysOnTop(), false, 'should be dropped while waiting');

			if (was) windowHost.setAlwaysOnTop(w, true);
			assert.strictEqual(w.isAlwaysOnTop(), true, 'should be restored afterwards');
			if (process.platform === 'darwin') {
				assert.strictEqual(w.isVisibleOnAllWorkspaces(), true,
					'the restored window should be at the same level as before');
			}
		} finally {
			w.destroy();
		}
	});

	check('a destroyed or missing window is ignored rather than throwing', () => {
		// The window can go away while a sync is still finishing.
		const w = makeWindow();
		w.destroy();
		windowHost.setAlwaysOnTop(w, true);
		windowHost.setAlwaysOnTop(null, true);
		windowHost.setAlwaysOnTop(undefined, false);
	});

	let failed = 0;
	for (const r of results) {
		if (r.ok) {
			console.log(`  ok   ${r.name}`);
		} else {
			failed++;
			console.log(`  FAIL ${r.name}`);
			console.log(`         ${r.msg}`);
		}
	}
	console.log(`\n${results.length - failed}/${results.length} passed`);
	app.exit(failed === 0 ? 0 : 1);
});
