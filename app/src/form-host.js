// Konfabulator's form() dialog, as a modal BrowserWindow.
//
// form(items, title, okLabel) was synchronous: it blocked until the user
// confirmed, then returned an array of string values (or null on cancel).
// The ported code depends on that shape — it reads results[0], results[1]
// and so on immediately after the call.
//
// This works because of how ipcRenderer.sendSync is implemented: the calling
// *renderer* blocks, while the main process keeps running its event loop and
// can drive a modal window. The reply is sent whenever the user answers.
// Konfabulator behaved the same way — the widget froze while a form was up.

'use strict';

const { ipcMain, BrowserWindow, dialog, Menu } = require('electron');

function escapeHtml(s) {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function buildHtml(items, title, okLabel, cancelLabel) {
	const fields = items.map((item, i) => {
		const id = `f${i}`;
		const label = escapeHtml(item.title || '');
		const desc = item.description
			? `<div class="desc">${escapeHtml(item.description)}</div>` : '';
		const value = item.defaultValue === undefined || item.defaultValue === null
			? '' : String(item.defaultValue);

		if (item.type === 'checkbox') {
			const checked = value === '1' || value === 'true' ? ' checked' : '';
			return `<div class="row"><label><input type="checkbox" id="${id}"${checked}> ${label}</label>${desc}</div>`;
		}

		if (item.type === 'popup' && Array.isArray(item.option)) {
			const opts = item.option.map((o, j) => {
				const ov = item.optionValue && item.optionValue[j] !== undefined
					? item.optionValue[j] : o;
				const sel = String(ov) === value ? ' selected' : '';
				return `<option value="${escapeHtml(String(ov))}"${sel}>${escapeHtml(String(o))}</option>`;
			}).join('');
			return `<div class="row"><label for="${id}">${label}</label><select id="${id}">${opts}</select>${desc}</div>`;
		}

		return `<div class="row"><label for="${id}">${label}</label>`
			+ `<input type="text" id="${id}" value="${escapeHtml(value)}">${desc}</div>`;
	}).join('\n');

	return `<!doctype html>
<html><head><meta charset="utf-8"><style>
	body { font: 13px -apple-system, "Helvetica Neue", sans-serif; margin: 0; padding: 16px;
	       background: #ececec; color: #111;
	       /* Labels and descriptions are chrome, not content. */
	       user-select: none; -webkit-user-select: none; cursor: default; }
	input[type=text], select, textarea { user-select: text; -webkit-user-select: text; cursor: auto; }
	h1 { font-size: 14px; margin: 0 0 14px; }
	.row { margin-bottom: 12px; }
	label { display: block; margin-bottom: 4px; }
	input[type=text], select { width: 100%; box-sizing: border-box; padding: 4px 6px;
	       font: inherit; border: 1px solid #aaa; border-radius: 4px; background: #fff; }
	.desc { color: #666; font-size: 11px; margin-top: 3px; }
	.buttons { text-align: right; margin-top: 18px; }
	button { font: inherit; padding: 4px 16px; margin-left: 8px; border-radius: 5px;
	       border: 1px solid #aaa; background: #fff; }
	button.ok { background: #3b6fd4; border-color: #3b6fd4; color: #fff; font-weight: 500; }
	@media (prefers-color-scheme: dark) {
		body { background: #2a2a2a; color: #eee; }
		input[type=text], select { background: #1e1e1e; color: #eee; border-color: #555; }
		button { background: #3a3a3a; color: #eee; border-color: #555; }
		.desc { color: #999; }
	}
</style></head>
<body>
	<h1>${escapeHtml(title || '')}</h1>
	<form id="form">
		${fields}
		<div class="buttons">
			<button type="button" id="cancel">${escapeHtml(cancelLabel)}</button>
			<button type="submit" class="ok">${escapeHtml(okLabel)}</button>
		</div>
	</form>
	<script>
		const { ipcRenderer } = require('electron');
		const count = ${items.length};
		function send(v) { ipcRenderer.send('form:done', v); }
		document.getElementById('form').addEventListener('submit', (e) => {
			e.preventDefault();
			const out = [];
			for (let i = 0; i < count; i++) {
				const el = document.getElementById('f' + i);
				out.push(el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value);
			}
			send(out);
		});
		document.getElementById('cancel').addEventListener('click', () => send(null));
		document.addEventListener('keydown', (e) => { if (e.key === 'Escape') send(null); });
		const first = document.querySelector('input, select');
		if (first) first.focus();
	<\/script>
</body></html>`;
}

function register() {
	// The renderer blocks on this; the reply is deferred until the modal is
	// answered, which is exactly the semantics form() needs.
	ipcMain.on('host:form', (event, items, title, okLabel, cancelLabel) => {
		const parent = BrowserWindow.fromWebContents(event.sender);
		const height = Math.min(620, 140 + items.length * 72);

		const win = new BrowserWindow({
			width: 420,
			height,
			parent: parent || undefined,
			// Not modal: on macOS a modal child is attached as a sheet, which
			// has no titlebar of its own — and the parent widget is
			// frameless, so there was nothing to drag the dialog by. Keeping
			// `parent` still floats it above the widget.
			modal: false,
			resizable: false,
			minimizable: false,
			maximizable: false,
			title: title || '',
			// The dialog is generated here, not loaded from user content.
			webPreferences: { nodeIntegration: true, contextIsolation: false },
		});

		win.setMenu(null);

		let settled = false;
		const reply = (value) => {
			if (settled) return;
			settled = true;
			ipcMain.removeListener('form:done', onDone);
			event.returnValue = value;
			if (!win.isDestroyed()) win.destroy();
		};

		const onDone = (e, values) => {
			// Only listen to our own dialog.
			if (e.sender !== win.webContents) return;
			reply(values === undefined ? null : values);
		};

		ipcMain.on('form:done', onDone);
		// Closing the window by any other route counts as a cancel.
		win.on('closed', () => reply(null));

		const html = buildHtml(items, title, okLabel, cancelLabel);
		win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
	});

	// Konfabulator's popupMenu(items, x, y): a context menu shown at a point
	// on screen, blocking until the user picks something. It returns the
	// index chosen (-1 if dismissed) and the caller fires that item's
	// onSelect. Used by the [+] button, the project name, and WidGUI's
	// dropdown lists — all three did nothing without it.
	ipcMain.on('host:popup-menu', (event, items, x, y) => {
		const win = BrowserWindow.fromWebContents(event.sender);

		const template = items.map((item, index) => {
			if (item.title === '-') return { type: 'separator' };
			return {
				label: String(item.title === undefined || item.title === null ? '' : item.title),
				enabled: item.enabled !== false,
				type: item.checked ? 'checkbox' : 'normal',
				checked: !!item.checked,
				click: () => { chosen = index; },
			};
		});

		let chosen = -1;
		const menu = Menu.buildFromTemplate(template);

		// popup() is asynchronous but the renderer is blocked on sendSync, so
		// the reply is deferred to the callback — the same trick form() uses.
		menu.popup({
			window: win || undefined,
			x: Math.round(Number(x) || 0),
			y: Math.round(Number(y) || 0),
			callback: () => { event.returnValue = chosen; },
		});
	});

	// Konfabulator's alert(message, ...buttons) is a message box that returns
	// the index of the button pressed — not the browser's alert(). With no
	// buttons given it's a plain notice with an OK button.
	ipcMain.on('host:alert', (event, message, buttons) => {
		const parent = BrowserWindow.fromWebContents(event.sender);
		const labels = Array.isArray(buttons) && buttons.length ? buttons : ['OK'];

		const index = dialog.showMessageBoxSync(parent || undefined, {
			type: 'none',
			message: String(message == null ? '' : message),
			buttons: labels.map(String),
			defaultId: 0,
			// Escape should mean the last button, which is the safe one in
			// every call site here ("No" / "Cancel").
			cancelId: labels.length - 1,
			noLink: true,
		});

		// Konfabulator numbered the buttons from 1, and every call site
		// relies on it — "if (answer == 2) return;" is how the widget
		// cancels a destructive action. Returning Electron's 0-based index
		// made "No" read as 1, so Delete All deleted everything anyway.
		event.returnValue = index + 1;
	});
}

module.exports = { register, buildHtml };
