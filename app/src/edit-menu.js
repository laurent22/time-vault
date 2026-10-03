// Right-click editing for text fields.
//
// Konfabulator's own dialogs had this; the port's are plain BrowserWindows,
// which have no context menu at all unless one is built. The keyboard
// shortcuts come from the Edit menu in menu.js — on macOS that menu is global
// so it covers these windows too, but Windows and Linux dialogs call
// setMenu(null), which is why the accelerators are attached here as well.

'use strict';

const { Menu, MenuItem } = require('electron');

// Attaches a cut/copy/paste menu to a window's text fields.
function attachEditMenu(win) {
	if (!win || win.isDestroyed()) return;

	win.webContents.on('context-menu', (_event, params) => {
		const { isEditable, selectionText, editFlags } = params;

		// Only offer Copy on a non-editable element, and only when there's
		// something selected — an empty menu on every right-click is worse
		// than none.
		if (!isEditable && !selectionText) return;

		const menu = new Menu();

		if (isEditable) {
			menu.append(new MenuItem({ role: 'undo', enabled: editFlags.canUndo }));
			menu.append(new MenuItem({ role: 'redo', enabled: editFlags.canRedo }));
			menu.append(new MenuItem({ type: 'separator' }));
			menu.append(new MenuItem({ role: 'cut', enabled: editFlags.canCut }));
		}

		menu.append(new MenuItem({ role: 'copy', enabled: editFlags.canCopy }));

		if (isEditable) {
			menu.append(new MenuItem({ role: 'paste', enabled: editFlags.canPaste }));
			menu.append(new MenuItem({ type: 'separator' }));
			menu.append(new MenuItem({ role: 'selectAll' }));
		}

		menu.popup({ window: win });
	});
}

module.exports = { attachEditMenu };
