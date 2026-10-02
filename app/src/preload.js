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
	windowPosition: () => ipcRenderer.sendSync('window:get-position-sync'),
	setPosition: (x, y) => ipcRenderer.send('window:set-position', x, y),
	setSize: (w, h) => ipcRenderer.send('window:set-size', w, h),
	setIgnoreMouseEvents: (ignore) => ipcRenderer.send('window:set-ignore-mouse', ignore),
	getWorkArea: () => ipcRenderer.invoke('screen:get-work-area'),

	// --- filesystem (sync) ---
	fs: (method, ...args) => ipcRenderer.sendSync('host:fs', method, ...args),

	// --- sqlite (sync) ---
	sql: (method, ...args) => ipcRenderer.sendSync('host:sql', method, ...args),

	// --- dialogs (sync; the renderer blocks while the modal is up, as the
	//     original did) ---
	form: (items, title, okLabel, cancelLabel) =>
		ipcRenderer.sendSync('host:form', items, title, okLabel, cancelLabel),
	alert: (message, buttons) => ipcRenderer.sendSync('host:alert', message, buttons),
	popupMenu: (items, x, y) => ipcRenderer.sendSync('host:popup-menu', items, x, y),
	preferences: (groups, title) => ipcRenderer.sendSync('host:preferences', groups, title),

	// --- menu / tray commands ---
	onCommand: (callback) => {
		const channels = [
			'menu:preferences', 'menu:toggle-timer', 'menu:toggle-drawer',
			'menu:publish-reports', 'menu:reveal-reports', 'menu:reset-position',
			'menu:zoom-in', 'menu:zoom-out', 'menu:zoom-reset',
			'menu:joplin-forget',
			'tray:preferences', 'tray:toggle-timer',
		];
		// Only the channel name is forwarded — never the event, which would
		// hand the renderer a way to reach the main process directly.
		for (const channel of channels) {
			ipcRenderer.on(channel, () => callback(channel));
		}
	},
	setTrayState: (state) => ipcRenderer.send('host:tray-state', state),
	showAbout: () => ipcRenderer.send('host:show-about'),

	// --- Joplin ---
	joplinSync: (options) => ipcRenderer.invoke('joplin:sync', options),
	joplinSyncOnQuit: () => ipcRenderer.send('joplin:sync-on-quit'),
	joplinSetEnabled: (enabled) => ipcRenderer.send('host:joplin-enabled', enabled),
	joplinForget: () => ipcRenderer.invoke('joplin:forget'),
	joplinStatus: () => ipcRenderer.invoke('joplin:status'),
	setAlwaysOnTop: (on) => ipcRenderer.send('window:set-always-on-top', on),
	onAlwaysOnTop: (callback) => {
		ipcRenderer.on('tray:set-always-on-top', (_event, on) => callback(!!on));
	},
	logError: (message) => ipcRenderer.send('host:log-error', message),

	// --- preferences ---
	loadPreferences: () => ipcRenderer.sendSync('host:load-preferences'),
	savePreferences: (values) => ipcRenderer.send('host:save-preferences', values),
	savePreferencesSync: (values) => ipcRenderer.sendSync('host:save-preferences-sync', values),

	// --- environment (sync, read once at startup) ---
	widgetDataFolder: () => ipcRenderer.sendSync('host:data-folder'),
	workArea: () => ipcRenderer.sendSync('host:work-area'),
	appVersion: () => ipcRenderer.sendSync('host:app-version'),
	assetRoot: () => ipcRenderer.sendSync('host:asset-root'),
	extractFile: (rel) => ipcRenderer.sendSync('host:extract-file', rel),
	platform: () => process.platform,
	openExternal: (url) => ipcRenderer.send('host:open-external', url),
});
