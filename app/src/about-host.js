// The About box.
//
// Konfabulator rendered this from an <about-box> declaration in the .kon:
// a background image with text positioned over it. The engine supplied the
// window; the widget only described what went in it.
//
// Positions, sizes, colours and shadows below are taken verbatim from
// Contents/Time Vault.kon, so it looks as it did in 2008. The one change is
// the contact address, which the repo no longer carries.
//
// Two versions are shown: the widget's own, from the original manifest, and
// the port's, since they're different things with different histories.

'use strict';

const { app, ipcMain, BrowserWindow, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// Straight from the <about-box> element.
const WIDTH = 396;
const HEIGHT = 180;

let aboutWindow = null;

// The widget's version, from the original Contents/widget.xml — not the
// app's, which is the port's own numbering.
function widgetVersion() {
	try {
		const xml = fs.readFileSync(
			path.join(__dirname, '..', '..', 'Contents', 'widget.xml'), 'utf8');
		const m = /<version>([^<]+)<\/version>/.exec(xml);
		if (m) return m[1].trim();
	} catch {
		// Falls through to the port's version below.
	}
	return null;
}

// The port's own version. app.getVersion() reports Electron's here, since
// this window is created outside the app's package context.
function portPackageVersion() {
	try {
		const pkg = JSON.parse(
			fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
		if (pkg.version) return pkg.version;
	} catch {
		// Falls through.
	}
	return app.getVersion();
}

function buildHtml(version) {
	const background = path.join(__dirname, '..', 'assets', 'About.png');
	// Inlined, so the window needs no file access of its own.
	const data = fs.readFileSync(background).toString('base64');

	// Konfabulator's <shadow hOffset="0" vOffset="1" color="#ffffff"/>.
	const shadow = 'text-shadow: 0 1px 0 #ffffff;';
	const portVersion = portPackageVersion();

	return `<!doctype html>
<html><head><meta charset="utf-8"><title>About TimeVault</title><style>
	html, body { margin: 0; padding: 0; width: ${WIDTH}px; height: ${HEIGHT}px;
	             overflow: hidden; background: transparent;
	             user-select: none; -webkit-user-select: none; cursor: default; }
	#bg { position: absolute; inset: 0;
	      background-image: url(data:image/png;base64,${data});
	      background-size: ${WIDTH}px ${HEIGHT}px; }
	.t { position: absolute; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
	     white-space: nowrap; }
	/* Konfabulator positions about-text by its baseline, not its top. */
	.t { transform: translateY(-100%); }
	a { color: inherit; text-decoration: none; cursor: pointer; }
	a:hover { text-decoration: underline; }
</style></head>
<body>
	<div id="bg"></div>

	<div class="t" style="left:115px; top:46px; font-size:20px; font-weight:bold; ${shadow}">Time Vault</div>

	<div class="t" style="left:115px; top:90px; font-size:14px; font-weight:bold; color:#222222; ${shadow}">Version</div>
	<div class="t" style="left:170px; top:90px; font-size:14px; font-weight:bold; color:#222222;">${version}</div>
	<div class="t" style="left:115px; top:104px; font-size:10px; color:#666666; ${shadow}">Electron port ${portVersion}</div>

	<div class="t" style="left:202px; top:125px; font-size:11px; color:#222222; ${shadow}"><a href="#" data-url="http://www.pogopixels.com/">View more widgets by pogopixels</a></div>

	<div class="t" style="left:199px; top:141px; font-size:11px; color:#222222; ${shadow}"><a href="#" data-url="https://github.com/laurent22">Originally by Laurent Cozic</a></div>

	<!-- The logo is a link, as it was in the original: an empty text block
	     sized to cover it. -->
	<a href="#" data-url="http://www.pogopixels.com/"
	   style="position:absolute; left:28px; top:112px; width:120px; height:34px;"></a>

	<script>
		const { ipcRenderer } = require('electron');
		for (const a of document.querySelectorAll('[data-url]')) {
			a.addEventListener('click', (e) => {
				e.preventDefault();
				ipcRenderer.send('about:open-url', a.dataset.url);
			});
		}
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' || e.key === 'w' && (e.metaKey || e.ctrlKey)) {
				ipcRenderer.send('about:close');
			}
		});
	<\/script>
</body></html>`;
}

function show(parent) {
	// One at a time; bring the existing one forward instead.
	if (aboutWindow && !aboutWindow.isDestroyed()) {
		aboutWindow.focus();
		return aboutWindow;
	}

	aboutWindow = new BrowserWindow({
		width: WIDTH,
		height: HEIGHT,
		useContentSize: true,
		parent: parent || undefined,
		resizable: false,
		minimizable: false,
		maximizable: false,
		fullscreenable: false,
		title: 'About TimeVault',
		// The artwork draws its own rounded frame, as the original did.
		frame: false,
		transparent: true,
		hasShadow: true,
		webPreferences: { nodeIntegration: true, contextIsolation: false },
	});

	aboutWindow.setMenu(null);
	aboutWindow.loadURL(
		`data:text/html;charset=utf-8,${encodeURIComponent(buildHtml(widgetVersion() || app.getVersion()))}`);
	aboutWindow.on('closed', () => { aboutWindow = null; });

	// No titlebar, so it closes on blur — the original's did too.
	aboutWindow.on('blur', () => {
		if (aboutWindow && !aboutWindow.isDestroyed()) aboutWindow.close();
	});

	return aboutWindow;
}

function register() {
	ipcMain.on('about:open-url', (_event, url) => {
		if (/^https?:/i.test(String(url))) shell.openExternal(url);
	});

	// The widget's context menu asks for it through the renderer.
	ipcMain.on('host:show-about', (event) => {
		show(BrowserWindow.fromWebContents(event.sender));
	});

	ipcMain.on('about:close', () => {
		if (aboutWindow && !aboutWindow.isDestroyed()) aboutWindow.close();
	});
}

module.exports = { register, show, buildHtml };
