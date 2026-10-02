// TimeVault — Electron main process.
//
// The original widget floated a frameless, irregularly-shaped window on the
// desktop. Reproducing that needs transparent:true at creation time (it can't
// be toggled later) and hasShadow:false, otherwise macOS draws a rectangular
// shadow around the invisible parts of the window.

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');
const host = require('./host');
const sqlHost = require('./sql-host');
const formHost = require('./form-host');
const windowHost = require('./window-host');
const prefsHost = require('./prefs-host');
const trayHost = require('./tray-host');
const menu = require('./menu');
const aboutHost = require('./about-host');

// The original skin is 1x artwork laid out in absolute pixel coordinates, so
// the window starts at a size big enough for the default layout. MainWindow.js
// resizes it from saved preferences once the shim is running.
const DEFAULT_WIDTH = 460;
const DEFAULT_HEIGHT = 420;

let mainWindow = null;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: DEFAULT_WIDTH,
		height: DEFAULT_HEIGHT,
		transparent: true,
		frame: false,
		hasShadow: false,
		// Off by default; shim/always-on-top.js turns it on at startup if the
		// preference says so.
		alwaysOnTop: false,
		// Resizable so the renderer can size the window to the widget's
		// content; there's no frame, so the user can't drag-resize it anyway.
		resizable: true,
		// Widget-style windows shouldn't steal focus or appear in the app
		// switcher the way a document window does.
		skipTaskbar: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	mainWindow.loadFile(path.join(__dirname, 'index.html'));

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

app.whenReady().then(() => {
	host.register();
	sqlHost.register();
	formHost.register();
	windowHost.register();
	prefsHost.register();
	trayHost.register();
	aboutHost.register();
	createWindow();

	trayHost.create(() => mainWindow);
	menu.install(() => mainWindow);

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

// Close databases cleanly so SQLite doesn't leave a stale -journal behind.
app.on('will-quit', () => {
	sqlHost.closeAll();
});
