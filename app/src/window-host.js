// Main-process window controls: move, resize, click-through.
//
// Konfabulator gave widgets these for free — the engine dragged the window
// and shaped it so clicks outside the artwork fell through. A frameless
// Electron window has neither, so the renderer drives them from here.
//
// Separate from main.js so the test probes register the same handlers the
// real app does, rather than silently running without them.

'use strict';

const { ipcMain, BrowserWindow, screen } = require('electron');

function register() {
	// Dragging: deliberately manual rather than -webkit-app-region:drag,
	// which swallows every event on the dragged element and would stop the
	// start button and round buttons responding.
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

	// MainWindow reads the window position while it builds, so it needs a
	// synchronous answer.
	ipcMain.on('window:get-position-sync', (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		event.returnValue = win ? win.getPosition() : [0, 0];
	});

	ipcMain.on('window:set-position', (event, x, y) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (win) win.setPosition(Math.round(x), Math.round(y));
	});

	ipcMain.on('window:set-size', (event, w, h) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (!win) return;
		// setSize on a resizable:false window is honoured, but the content
		// size is what the layout cares about.
		win.setContentSize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
	});

	// forward:true keeps mousemove flowing to the renderer while ignoring,
	// which is what lets it notice the cursor returning to solid artwork and
	// take control back.
	ipcMain.on('window:set-ignore-mouse', (event, ignore) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		if (win) win.setIgnoreMouseEvents(!!ignore, { forward: true });
	});

	// Konfabulator's screen.availableWidth / availableHeight.
	ipcMain.handle('screen:get-work-area', () => screen.getPrimaryDisplay().workArea);
}

module.exports = { register };
