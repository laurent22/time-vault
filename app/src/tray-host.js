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
let state = { running: false, project: '', elapsed: '' };

function iconPath() {
	// A template image lets macOS invert it for light and dark menu bars.
	return path.join(__dirname, '..', 'assets', 'TrayIconTemplate.png');
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
	tray.setContextMenu(buildMenu());
	tray.setToolTip(state.running
		? `TimeVault — ${state.elapsed}${state.project ? ` (${state.project})` : ''}`
		: 'TimeVault');
}

function create(windowGetter) {
	getWindow = windowGetter;

	let image = nativeImage.createFromPath(iconPath());
	if (image.isEmpty()) {
		// Ship without a dedicated tray asset rather than failing to start;
		// an empty image would give an invisible, unclickable tray item.
		image = nativeImage.createFromNamedImage
			? nativeImage.createFromNamedImage('NSStatusAvailable', [-1, 0, 1])
			: image;
	}
	if (image.isEmpty()) {
		console.warn('[tray] no usable icon; skipping the tray item');
		return null;
	}

	image.setTemplateImage(true);
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
