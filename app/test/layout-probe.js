// Reports the rendered geometry of the booted widget, so layout can be
// checked without a screenshot.

'use strict';

const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const TEST_USER_DATA = path.join(app.getPath('temp'), 'timevault-probe');
fs.rmSync(TEST_USER_DATA, { recursive: true, force: true });
app.setPath('userData', TEST_USER_DATA);

const host = require('../src/host');
const sqlHost = require('../src/sql-host');
const formHost = require('../src/form-host');
const windowHost = require('../src/window-host');

app.on('window-all-closed', () => {});

app.whenReady().then(async () => {
	host.register();
	sqlHost.register();
	formHost.register();
	windowHost.register();

	const win = new BrowserWindow({
		show: false,
		width: 460,
		height: 420,
		webPreferences: {
			preload: path.join(__dirname, '..', 'src', 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
	await win.webContents.executeJavaScript(`new Promise((resolve) => {
		if (window.KON_WIDGET_READY) return resolve(true);
		document.addEventListener('kon-widget-ready', () => resolve(true), { once: true });
		setTimeout(() => resolve(false), 15000);
	})`);
	await new Promise((r) => setTimeout(r, 800));

	const report = JSON.parse(await win.webContents.executeJavaScript(`JSON.stringify((() => {
		const out = { visible: [], offscreen: [], zeroSize: [], brokenImages: [] };

		for (const el of document.querySelectorAll('#stage *')) {
			const r = el.getBoundingClientRect();
			const cs = getComputedStyle(el);
			const hidden = cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0;

			if (el.tagName === 'IMG' && el.src && (!el.complete || el.naturalWidth === 0)) {
				out.brokenImages.push(el.getAttribute('src'));
			}

			const label = el.tagName.toLowerCase()
				+ (el.tagName === 'IMG' ? ':' + (el.getAttribute('src') || '').split('/').pop() : '')
				+ (el.textContent && el.tagName !== 'IMG' && el.children.length === 0
					? ' "' + el.textContent.slice(0, 20) + '"' : '');

			const box = Math.round(r.left) + ',' + Math.round(r.top)
				+ ' ' + Math.round(r.width) + 'x' + Math.round(r.height);

			if (r.width === 0 || r.height === 0) {
				out.zeroSize.push(label + ' @ ' + box);
			} else if (r.left > 460 || r.top > 420 || r.right < 0 || r.bottom < 0) {
				out.offscreen.push(label + ' @ ' + box);
			} else if (!hidden) {
				out.visible.push(label + ' @ ' + box);
			}
		}

		return out;
	})())`));

	const show = (title, list, limit = 30) => {
		console.log(`\n=== ${title} (${list.length}) ===`);
		for (const l of list.slice(0, limit)) console.log('  ' + l);
		if (list.length > limit) console.log(`  ... and ${list.length - limit} more`);
	};

	show('visible', report.visible);
	show('zero size', report.zeroSize, 12);
	show('offscreen', report.offscreen, 12);
	show('BROKEN IMAGES', report.brokenImages, 20);

	app.exit(0);
});
