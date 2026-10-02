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
//   TrayIcon         stopped — desaturated to grey
//   TrayIconRunning  running — full colour
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

// Scales the artwork, and for the stopped state drains the colour out of it.
// Desaturating reads as "inactive" far more clearly than dimming does, and
// unlike a shape change it keeps the icon recognisable as the same thing.
// Alpha is untouched, so the sphere keeps its anti-aliased edge.
function render(img, size, grey) {
	const scaled = img.resize({ width: size, height: size, quality: 'best' });
	if (!grey) return scaled;

	const src = scaled.toBitmap(); // BGRA
	const out = Buffer.from(src);
	for (let i = 0; i < out.length; i += 4) {
		// Rec. 601 luma, which matches how the eye weights the channels.
		const luma = Math.round(src[i + 2] * 0.299 + src[i + 1] * 0.587 + src[i] * 0.114);
		// Lightened a little as well, so the grey clearly reads as muted
		// rather than as a differently-coloured icon.
		const muted = Math.round(luma * 0.75 + 255 * 0.25);
		out[i] = muted;
		out[i + 1] = muted;
		out[i + 2] = muted;
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
		{ name: 'TrayIcon', grey: true },
		{ name: 'TrayIconRunning', grey: false },
	];

	for (const variant of variants) {
		for (const scale of [1, 2]) {
			const size = SIZE * scale;
			const img = render(source, size, variant.grey);
			const file = `${variant.name}${scale === 2 ? '@2x' : ''}.png`;
			fs.writeFileSync(path.join(ASSETS, file), img.toPNG());
			console.log(`wrote ${file} (${size}x${size})`);
		}
	}

	app.exit(0);
});
