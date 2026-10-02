#!/usr/bin/env node
//
// Generates the menu-bar tray icons from the original 2008 artwork in
// TrayIcon/TimeVaultTrayIcon.ico.
//
// The original's tray presence was a Windows-only AutoHotkey executable, which
// the port drops in favour of Electron's Tray — but its .ico is the real
// artwork and is worth keeping rather than downscaling a different icon.
//
// Two icons are produced, which the original never had: the AutoHotkey script
// was only a liveness watchdog and never changed its icon. Reflecting whether
// the timer is running is a genuine improvement, and it's what a menu-bar item
// is for.
//
//   TrayIconTemplate      stopped — outline only
//   TrayIconRunningTemplate   running — filled
//
// Both are template images: macOS keeps only the alpha and recolours them for
// the current menu bar, so they must be a silhouette. The source is a colour
// icon, so it's thresholded to alpha here rather than used directly — a
// mostly-light image becomes an unreadable blob as a template.
//
// Run with Electron, not node — it uses nativeImage:
//   npm run gen

'use strict';

const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ASSETS = path.join(__dirname, '..', 'assets');
// The original 2008 artwork. Electron can't read .ico on macOS, so a PNG is
// extracted alongside it with:
//   sips -s format png TrayIcon.ico --out TrayIcon.png
// (TimeVaultTrayIcon.ico extracts empty — sips can't read its 32-bit frames.)
const SOURCE = path.join(__dirname, '..', '..', 'TrayIcon', 'TrayIcon.png');
const FALLBACK = path.join(ASSETS, 'TimeIcon.png');

const SIZE = 16;

// Builds a silhouette from the source: anything meaningfully opaque becomes
// solid black, everything else transparent. `filled` keeps the whole shape;
// otherwise only its edge is kept, giving a hollow outline for the stopped
// state.
function silhouette(img, size, filled) {
	const scaled = img.resize({ width: size, height: size, quality: 'best' });
	const src = scaled.toBitmap(); // BGRA
	const out = Buffer.alloc(size * size * 4);

	const alphaAt = (x, y) => {
		if (x < 0 || y < 0 || x >= size || y >= size) return 0;
		return src[(y * size + x) * 4 + 3];
	};

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const solid = alphaAt(x, y) > 60;

			let keep = solid;
			if (solid && !filled) {
				// An edge pixel has at least one transparent neighbour.
				keep = alphaAt(x - 1, y) <= 60 || alphaAt(x + 1, y) <= 60
					|| alphaAt(x, y - 1) <= 60 || alphaAt(x, y + 1) <= 60;
			}

			// Black with alpha; macOS recolours it for the menu bar.
			out[i] = 0;
			out[i + 1] = 0;
			out[i + 2] = 0;
			out[i + 3] = keep ? src[i + 3] : 0;
		}
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
		{ name: 'TrayIconTemplate', filled: false },
		{ name: 'TrayIconRunningTemplate', filled: true },
	];

	for (const variant of variants) {
		for (const scale of [1, 2]) {
			const size = SIZE * scale;
			const img = silhouette(source, size, variant.filled);
			const file = `${variant.name}${scale === 2 ? '@2x' : ''}.png`;
			fs.writeFileSync(path.join(ASSETS, file), img.toPNG());
			console.log(`wrote ${file} (${size}x${size})`);
		}
	}

	app.exit(0);
});
