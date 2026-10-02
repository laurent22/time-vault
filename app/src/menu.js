// The application menu.
//
// A frameless widget has no chrome of its own, so without this there's no way
// to reach preferences or quit except the tray. On macOS the menu bar exists
// whether we populate it or not, and an unpopulated one has no Quit item.

'use strict';

const { app, Menu, shell } = require('electron');
const aboutHost = require('./about-host');

function install(getWindow) {
	const send = (channel) => () => {
		const win = getWindow();
		if (win && !win.isDestroyed()) win.webContents.send(channel);
	};

	const isMac = process.platform === 'darwin';

	const template = [
		...(isMac ? [{
			label: app.name,
			submenu: [
				// The widget's own about box, not the stock one.
				{ label: 'About TimeVault', click: () => aboutHost.show(getWindow()) },
				{ type: 'separator' },
				{ label: 'Preferences…', accelerator: 'Cmd+,', click: send('menu:preferences') },
				{ type: 'separator' },
				{ role: 'hide' },
				{ role: 'hideOthers' },
				{ type: 'separator' },
				{ role: 'quit' },
			],
		}] : []),
		{
			label: 'Timer',
			submenu: [
				{ label: 'Start / Stop', accelerator: 'CmdOrCtrl+T', click: send('menu:toggle-timer') },
				{ type: 'separator' },
				{ label: 'Open / Close Drawer', accelerator: 'CmdOrCtrl+D', click: send('menu:toggle-drawer') },
				...(isMac ? [] : [
					{ type: 'separator' },
					{ label: 'Preferences…', accelerator: 'Ctrl+,', click: send('menu:preferences') },
					{ role: 'quit' },
				]),
			],
		},
		{
			label: 'Reports',
			submenu: [
				{ label: 'Publish Reports Now', click: send('menu:publish-reports') },
				{ label: 'Reveal Report Folder', click: send('menu:reveal-reports') },
				{ type: 'separator' },
				{ label: 'Sync to Joplin', click: send('menu:joplin-sync') },
				{ label: 'Forget Joplin Authorisation', click: send('menu:joplin-forget') },
			],
		},
		{
			label: 'Window',
			submenu: [
				{ label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: send('menu:zoom-in') },
				{ label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: send('menu:zoom-out') },
				{ label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: send('menu:zoom-reset') },
				{ type: 'separator' },
				{ label: 'Reset Position', click: send('menu:reset-position') },
				{ type: 'separator' },
				{ role: 'minimize' },
				{ role: 'close' },
				{ type: 'separator' },
				{ role: 'toggleDevTools' },
			],
		},
		{
			role: 'help',
			submenu: [
				...(isMac ? [] : [
					{ label: 'About TimeVault', click: () => aboutHost.show(getWindow()) },
					{ type: 'separator' },
				]),
				{
					label: 'Original Widget (2008)',
					click: () => shell.openExternal('https://en.wikipedia.org/wiki/Yahoo!_Widgets'),
				},
			],
		},
	];

	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { install };
