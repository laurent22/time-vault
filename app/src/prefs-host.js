// The preferences window, rendered in the main process.
//
// Synchronous like form(): the renderer blocks on sendSync while the user
// edits, and gets back a name -> value map (or null if cancelled). That
// matches how Konfabulator behaved — the widget froze while preferences were
// open — and lets konShowPreferences call the widget's onPreferencesChanged
// straight after the call returns.

'use strict';

const { ipcMain, BrowserWindow } = require('electron');

function escapeHtml(s) {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function fieldHtml(f) {
	const id = `p_${f.name}`;
	const label = escapeHtml(f.label);
	const desc = f.description ? `<div class="desc">${escapeHtml(f.description)}</div>` : '';
	const value = f.value === undefined || f.value === null ? '' : String(f.value);

	if (f.type === 'checkbox') {
		const checked = value === '1' || value === 'true' ? ' checked' : '';
		return `<div class="row"><label class="inline"><input type="checkbox" data-name="${escapeHtml(f.name)}" id="${id}"${checked}> ${label}</label>${desc}</div>`;
	}

	if (f.type === 'color') {
		return `<div class="row"><label for="${id}">${label}</label>`
			+ `<input type="color" data-name="${escapeHtml(f.name)}" id="${id}" value="${escapeHtml(value)}">${desc}</div>`;
	}

	if (f.type === 'popup' && Array.isArray(f.option) && f.option.length) {
		const opts = f.option.map((o, i) => {
			const ov = f.optionValue && f.optionValue[i] !== undefined ? f.optionValue[i] : o;
			const sel = String(ov) === value ? ' selected' : '';
			return `<option value="${escapeHtml(String(ov))}"${sel}>${escapeHtml(String(o))}</option>`;
		}).join('');
		return `<div class="row"><label for="${id}">${label}</label>`
			+ `<select data-name="${escapeHtml(f.name)}" id="${id}">${opts}</select>${desc}</div>`;
	}

	// "selector" is Konfabulator's file/folder picker; a text field is an
	// honest stand-in until the picker is wired up.
	return `<div class="row"><label for="${id}">${label}</label>`
		+ `<input type="text" data-name="${escapeHtml(f.name)}" id="${id}" value="${escapeHtml(value)}">${desc}</div>`;
}

function buildHtml(groups, title) {
	const tabs = groups.map((g, i) =>
		`<button type="button" class="tab${i === 0 ? ' active' : ''}" data-panel="${i}">${escapeHtml(g.title)}</button>`,
	).join('');

	const panels = groups.map((g, i) =>
		`<div class="panel${i === 0 ? ' active' : ''}" data-panel="${i}">${g.fields.map(fieldHtml).join('\n')}</div>`,
	).join('\n');

	return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
	body { font: 13px -apple-system, "Helvetica Neue", sans-serif; margin: 0;
	       background: #ececec; color: #111; display: flex; flex-direction: column; height: 100vh; }
	.tabs { display: flex; gap: 2px; padding: 10px 12px 0; flex: none; }
	.tab { font: inherit; padding: 5px 14px; border: 1px solid #bbb; border-bottom: none;
	       border-radius: 5px 5px 0 0; background: #ddd; cursor: pointer; }
	.tab.active { background: #fff; font-weight: 500; }
	.panels { flex: 1; overflow-y: auto; background: #fff; border-top: 1px solid #bbb;
	          padding: 14px 16px; }
	.panel { display: none; }
	.panel.active { display: block; }
	.row { margin-bottom: 14px; }
	label { display: block; margin-bottom: 4px; }
	label.inline { display: flex; align-items: center; gap: 6px; }
	input[type=text], select { width: 100%; box-sizing: border-box; padding: 4px 6px;
	       font: inherit; border: 1px solid #aaa; border-radius: 4px; background: #fff; }
	input[type=color] { width: 54px; height: 26px; padding: 1px; border: 1px solid #aaa;
	       border-radius: 4px; background: #fff; }
	.desc { color: #666; font-size: 11px; margin-top: 3px; }
	.buttons { flex: none; text-align: right; padding: 12px 16px; }
	button.action { font: inherit; padding: 4px 16px; margin-left: 8px; border-radius: 5px;
	       border: 1px solid #aaa; background: #fff; cursor: pointer; }
	button.ok { background: #3b6fd4; border-color: #3b6fd4; color: #fff; font-weight: 500; }
	@media (prefers-color-scheme: dark) {
		body { background: #2a2a2a; color: #eee; }
		.panels { background: #1e1e1e; border-color: #444; }
		.tab { background: #333; border-color: #444; color: #ccc; }
		.tab.active { background: #1e1e1e; color: #fff; }
		input[type=text], select { background: #2a2a2a; color: #eee; border-color: #555; }
		button.action { background: #3a3a3a; color: #eee; border-color: #555; }
		button.ok { background: #3b6fd4; border-color: #3b6fd4; color: #fff; }
		.desc { color: #999; }
	}
</style></head>
<body>
	<div class="tabs">${tabs}</div>
	<div class="panels">${panels}</div>
	<div class="buttons">
		<button type="button" class="action" id="cancel">Cancel</button>
		<button type="button" class="action ok" id="ok">OK</button>
	</div>
	<script>
		const { ipcRenderer } = require('electron');
		for (const tab of document.querySelectorAll('.tab')) {
			tab.addEventListener('click', () => {
				for (const t of document.querySelectorAll('.tab')) t.classList.remove('active');
				for (const p of document.querySelectorAll('.panel')) p.classList.remove('active');
				tab.classList.add('active');
				document.querySelector('.panel[data-panel="' + tab.dataset.panel + '"]').classList.add('active');
			});
		}
		document.getElementById('ok').addEventListener('click', () => {
			const out = {};
			for (const el of document.querySelectorAll('[data-name]')) {
				out[el.dataset.name] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
			}
			ipcRenderer.send('prefs:done', out);
		});
		document.getElementById('cancel').addEventListener('click', () => ipcRenderer.send('prefs:done', null));
		document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ipcRenderer.send('prefs:done', null); });
	<\/script>
</body></html>`;
}

function register() {
	ipcMain.on('host:preferences', (event, groups, title) => {
		const parent = BrowserWindow.fromWebContents(event.sender);

		const win = new BrowserWindow({
			width: 460,
			height: 520,
			parent: parent || undefined,
			modal: !!parent,
			resizable: false,
			minimizable: false,
			maximizable: false,
			title: title || 'Preferences',
			webPreferences: { nodeIntegration: true, contextIsolation: false },
		});

		win.setMenu(null);

		let settled = false;
		const reply = (value) => {
			if (settled) return;
			settled = true;
			ipcMain.removeListener('prefs:done', onDone);
			event.returnValue = value;
			if (!win.isDestroyed()) win.destroy();
		};

		const onDone = (e, values) => {
			if (e.sender !== win.webContents) return;
			reply(values === undefined ? null : values);
		};

		ipcMain.on('prefs:done', onDone);
		win.on('closed', () => reply(null));

		const html = buildHtml(groups, title || 'Preferences');
		win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
	});
}

module.exports = { register, buildHtml };
