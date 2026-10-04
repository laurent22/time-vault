// TimeVault — Electron main process.
//
// The original widget floated a frameless, irregularly-shaped window on the
// desktop. Reproducing that needs transparent:true at creation time (it can't
// be toggled later) and hasShadow:false, otherwise macOS draws a rectangular
// shadow around the invisible parts of the window.

const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

// Software rendering, deliberately.
//
// This is a small transparent frameless window. GPU compositing with
// per-pixel alpha takes an expensive path on macOS, and at 215x136 there is
// nothing to gain from it — no video, no WebGL, a handful of canvases.
//
// The dev build already runs entirely on software (measured: gpu_compositing,
// rasterization and 2d_canvas all disabled_software) and is smooth, while the
// packaged build was slow to start and visibly jerky. Matching dev removes
// that difference. Must be called before the app is ready.
app.disableHardwareAcceleration();

// Development runs get their own profile, so `npm start` can't disturb an
// installed build's database, preferences or Joplin token. A development
// build already talks to a development Joplin — see joplin-client.js — and
// this applies the same split to the data.
//
// The folder is pinned by name rather than left to Electron, which derives
// userData from the product name: renaming the app to "Time Vault" would
// otherwise have pointed it at an empty directory and orphaned everything.
//
// Must run before any host module is required — host.js resolves userData at
// module load, so a later override would be ignored.
app.setPath('userData', path.join(
	app.getPath('appData'),
	app.isPackaged ? 'TimeVault' : 'TimeVault (dev)',
));

if (!app.isPackaged) app.setName('Time Vault (dev)');

const host = require('./host');
const sqlHost = require('./sql-host');
const formHost = require('./form-host');
const windowHost = require('./window-host');
const prefsHost = require('./prefs-host');
const trayHost = require('./tray-host');
const menu = require('./menu');
const aboutHost = require('./about-host');
const joplinHost = require('./joplin-host');

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
	// Logged so a packaged build can report what it actually got: a
	// difference here between dev and release is worth knowing about, and
	// nothing else reveals it. Visible in Console.app for an installed app,
	// which writes nothing to stdout.
	const gpu = app.getGPUFeatureStatus();
	console.log(`[gpu] compositing=${gpu.gpu_compositing}`
		+ ` raster=${gpu.rasterization} 2d=${gpu['2d_canvas']}`
		+ ` packaged=${app.isPackaged}`);

	host.register();
	sqlHost.register();
	formHost.register();
	windowHost.register();
	prefsHost.register();
	trayHost.register();
	aboutHost.register();
	joplinHost.register();
	createWindow();

	trayHost.create(() => mainWindow);
	menu.install(() => mainWindow);

	// The renderer owns the preferences, so it tells us when the Joplin
	// feature is switched on or off and the menu is rebuilt to match.
	ipcMain.on('host:joplin-enabled', (_event, enabled) => {
		menu.install(() => mainWindow, { joplinEnabled: !!enabled });
	});

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
}).catch((e) => {
	// Without this a failure during startup is an unhandled rejection: the
	// process exits 0 with nothing printed and no window, which looks
	// exactly like a clean quit and is near-impossible to diagnose in a
	// packaged app, where stdout goes nowhere.
	console.error('[main] startup failed:', e && e.stack ? e.stack : e);
	app.exit(1);
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

// Close databases cleanly so SQLite doesn't leave a stale -journal behind.
app.on('will-quit', () => {
	sqlHost.closeAll();
});
