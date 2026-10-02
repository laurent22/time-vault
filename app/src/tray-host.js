// The tray icon.
//
// The original shipped a Windows-only AutoHotkey executable (TrayIcon/) that
// the widget launched to get a tray presence Konfabulator couldn't provide.
// Electron has Tray built in, so the .exe is dropped entirely and this works
// on macOS and Windows alike.

'use strict';

const { app, Tray, Menu, nativeImage, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

let tray = null;
let getWindow = () => null;

// What the tray shows about the current timer, pushed from the renderer.
let state = { running: false, project: '', elapsed: '', alwaysOnTop: false };

// The original 2008 artwork, dimmed when the timer is stopped and at full
// strength while it runs. The AutoHotkey tray never changed its icon — it was
// only a liveness watchdog — but telling the two states apart at a glance is
// the point of a menu-bar item.
//
// Deliberately not template images: a template keeps only the alpha and lets
// macOS recolour the shape, which flattens this detailed sphere into a plain
// circle.
function iconPath(running) {
	const name = running ? 'TrayIconRunning.png' : 'TrayIcon.png';
	return path.join(__dirname, '..', 'assets', name);
}

function loadIcon(running) {
	const image = nativeImage.createFromPath(iconPath(running));
	return image.isEmpty() ? null : image;
}

function buildMenu() {
	const win = getWindow();

	return Menu.buildFromTemplate([
		{
			label: state.running
				? `${state.elapsed || '00:00:00'}${state.project ? ` — ${state.project}` : ''}`
				: 'Not running',
			enabled: false,
		},
		{ type: 'separator' },
		{
			label: state.running ? 'Stop timer' : 'Start timer',
			click: () => send('tray:toggle-timer'),
		},
		{ type: 'separator' },
		{
			label: 'Show TimeVault',
			click: () => {
				const w = getWindow();
				if (w) { w.show(); w.focus(); }
			},
		},
		{
			label: 'Always on Top',
			type: 'checkbox',
			checked: !!state.alwaysOnTop,
			click: (item) => {
				const w = getWindow();
				if (w && !w.isDestroyed()) {
					w.setAlwaysOnTop(item.checked);
					// Tell the renderer the new value so it persists it —
					// the preferences file belongs to that side. Sending the
					// value rather than a "changed" ping avoids the two
					// sides toggling each other.
					w.webContents.send('tray:set-always-on-top', item.checked);
				}
				state.alwaysOnTop = item.checked;
				refresh();
			},
		},
		{
			label: 'Preferences…',
			click: () => send('tray:preferences'),
		},
		{ type: 'separator' },
		{ label: 'Quit TimeVault', click: () => app.quit() },
	]);

	function send(channel) {
		if (win && !win.isDestroyed()) win.webContents.send(channel);
	}
}

function refresh() {
	if (!tray) return;

	// Swap the icon so the menu bar shows at a glance whether time is being
	// recorded.
	const image = loadIcon(state.running);
	if (image) tray.setImage(image);

	tray.setContextMenu(buildMenu());
	tray.setToolTip(state.running
		? `TimeVault — ${state.elapsed}${state.project ? ` (${state.project})` : ''}`
		: 'TimeVault');
}

function create(windowGetter) {
	getWindow = windowGetter;

	const image = loadIcon(false);
	if (!image) {
		// Better no tray item than an invisible, unclickable one.
		console.warn('[tray] no usable icon; skipping the tray item');
		return null;
	}

	tray = new Tray(image);
	refresh();

	tray.on('click', () => {
		const w = getWindow();
		if (w) { w.show(); w.focus(); }
	});

	return tray;
}

function register() {
	ipcMain.on('host:tray-state', (_event, next) => {
		state = Object.assign({}, state, next || {});
		refresh();
	});
}

function destroy() {
	if (tray) { tray.destroy(); tray = null; }
}

module.exports = { create, register, destroy };
