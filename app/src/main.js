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
		alwaysOnTop: true,
		resizable: false,
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

// Dragging: there's no titlebar, so the renderer tells us where to move the
// window. Deliberately manual rather than -webkit-app-region:drag, because in
// the original only specific skin areas are drag handles.
ipcMain.on('window:move-by', (event, dx, dy) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (!win) return;
	const [x, y] = win.getPosition();
	win.setPosition(Math.round(x + dx), Math.round(y + dy));
});

ipcMain.handle('window:get-position', (event) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	return win ? win.getPosition() : [0, 0];
});

ipcMain.on('window:set-position', (event, x, y) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (win) win.setPosition(Math.round(x), Math.round(y));
});

ipcMain.on('window:set-size', (event, w, h) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	if (win) win.setSize(Math.round(w), Math.round(h));
});

// Konfabulator's screen.availableWidth / availableHeight.
ipcMain.handle('screen:get-work-area', () => {
	const { workArea } = screen.getPrimaryDisplay();
	return workArea;
});

app.whenReady().then(() => {
	host.register();
	sqlHost.register();
	createWindow();

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
