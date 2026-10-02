#!/usr/bin/env node
//
// Generates the menu-bar tray icons from the original 2008 artwork in
// TrayIcon/TrayIcon.ico — the blue striped sphere the widget shipped with.
//
// The original's tray presence was a Windows-only AutoHotkey executable, which
// the port drops in favour of Electron's Tray, but its icon is the real
// artwork and worth keeping.
//
// These are NOT template images. A template keeps only the alpha channel and
// lets macOS recolour the shape, which reduces a detailed icon to a flat blob
// — in this case a plain circle, since that's all the sphere's outline is.
// Colour icons are allowed in the menu bar and keep the artwork intact.
//
// Two variants are produced, which the original never had: the AutoHotkey
// script was only a liveness watchdog and never changed its icon. Showing
// whether the timer is running is the point of a menu-bar item.
//
//   TrayIcon         stopped — dimmed, so it recedes
//   TrayIconRunning  running — full strength
//
// Run with Electron, not node — it uses nativeImage:
//   npm run gen

'use strict';

const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ASSETS = path.join(__dirname, '..', 'assets');
// Electron can't read .ico on macOS, so a PNG is extracted alongside it with:
//   sips -s format png TrayIcon.ico --out TrayIcon.png
// (TimeVaultTrayIcon.ico extracts empty — sips can't read its 32-bit frames.)
const SOURCE = path.join(__dirname, '..', '..', 'TrayIcon', 'TrayIcon.png');
const FALLBACK = path.join(ASSETS, 'TimeIcon.png');

const SIZE = 16;

// Scales the artwork and optionally fades it. Fading is applied to alpha
// rather than to the colours, so the icon keeps its hues and simply sits
// back — legible against both light and dark menu bars.
function render(img, size, opacity) {
	const scaled = img.resize({ width: size, height: size, quality: 'best' });
	if (opacity >= 1) return scaled;

	const src = scaled.toBitmap(); // BGRA
	const out = Buffer.from(src);
	for (let i = 3; i < out.length; i += 4) {
		out[i] = Math.round(src[i] * opacity);
	}
	return nativeImage.createFromBitmap(out, { width: size, height: size });
}

app.whenReady().then(() => {
	let source = nativeImage.createFromPath(SOURCE);
	if (source.isEmpty()) {
		console.warn(`could not read ${path.relative(process.cwd(), SOURCE)}; falling back to TimeIcon.png`);
		source = nativeImage.createFromPath(FALLBACK);
	}
	if (source.isEmpty()) {
		console.error('no usable source icon');
		app.exit(1);
		return;
	}

	const variants = [
		{ name: 'TrayIcon', opacity: 0.55 },
		{ name: 'TrayIconRunning', opacity: 1 },
	];

	for (const variant of variants) {
		for (const scale of [1, 2]) {
			const size = SIZE * scale;
			const img = render(source, size, variant.opacity);
			const file = `${variant.name}${scale === 2 ? '@2x' : ''}.png`;
			fs.writeFileSync(path.join(ASSETS, file), img.toPNG());
			console.log(`wrote ${file} (${size}x${size})`);
		}
	}

	app.exit(0);
});
