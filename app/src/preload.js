// Bridges the main-process capabilities the shim needs into the renderer.
//
// Several of these are synchronous (sendSync) because the Konfabulator APIs
// they stand in for were synchronous and the ported code depends on it: the
// widget tests filesystem.itemExists() and reads the file in the same
// expression, and reads preferences during construction.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tvHost', {
	// --- window ---
	moveBy: (dx, dy) => ipcRenderer.send('window:move-by', dx, dy),
	getPosition: () => ipcRenderer.invoke('window:get-position'),
	setPosition: (x, y) => ipcRenderer.send('window:set-position', x, y),
	setSize: (w, h) => ipcRenderer.send('window:set-size', w, h),
	getWorkArea: () => ipcRenderer.invoke('screen:get-work-area'),

	// --- filesystem (sync) ---
	fs: (method, ...args) => ipcRenderer.sendSync('host:fs', method, ...args),

	// --- sqlite (sync) ---
	sql: (method, ...args) => ipcRenderer.sendSync('host:sql', method, ...args),

	// --- preferences ---
	loadPreferences: () => ipcRenderer.sendSync('host:load-preferences'),
	savePreferences: (values) => ipcRenderer.send('host:save-preferences', values),
	savePreferencesSync: (values) => ipcRenderer.sendSync('host:save-preferences-sync', values),

	// --- environment (sync, read once at startup) ---
	widgetDataFolder: () => ipcRenderer.sendSync('host:data-folder'),
	workArea: () => ipcRenderer.sendSync('host:work-area'),
	appVersion: () => ipcRenderer.sendSync('host:app-version'),
	platform: () => process.platform,
	openExternal: (url) => ipcRenderer.send('host:open-external', url),
});
