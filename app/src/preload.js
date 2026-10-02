// Bridges the few main-process capabilities the shim needs into the renderer.
// Kept deliberately small: everything else the ported widget code does runs in
// the renderer against the DOM.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tvHost', {
	moveBy: (dx, dy) => ipcRenderer.send('window:move-by', dx, dy),
	getPosition: () => ipcRenderer.invoke('window:get-position'),
	setPosition: (x, y) => ipcRenderer.send('window:set-position', x, y),
	setSize: (w, h) => ipcRenderer.send('window:set-size', w, h),
	getWorkArea: () => ipcRenderer.invoke('screen:get-work-area'),
});
