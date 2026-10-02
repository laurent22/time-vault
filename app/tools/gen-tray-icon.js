#!/usr/bin/env node
//
// Generates the menu-bar tray icons from the widget's own TimeIcon.png.
//
// The original's tray presence was a Windows-only AutoHotkey executable with
// its own .ico files, which the port drops in favour of Electron's Tray. The
// menu bar wants a small template image (black with alpha, so macOS can
// invert it for dark mode), which this derives from the existing 32x32 icon.
//
// Run with Electron, not node — it uses nativeImage:
//   node_modules/.../Electron tools/gen-tray-icon.js

'use strict';

const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ASSETS = path.join(__dirname, '..', 'assets');
const SOURCE = path.join(ASSETS, 'TimeIcon.png');

app.whenReady().then(() => {
	const img = nativeImage.createFromPath(SOURCE);
	if (img.isEmpty()) {
		console.error(`could not read ${SOURCE}`);
		app.exit(1);
		return;
	}

	for (const [size, name] of [[16, 'TrayIconTemplate.png'], [32, 'TrayIconTemplate@2x.png']]) {
		const resized = img.resize({ width: size, height: size, quality: 'best' });
		const out = path.join(ASSETS, name);
		fs.writeFileSync(out, resized.toPNG());
		console.log(`wrote ${name} (${size}x${size})`);
	}

	app.exit(0);
});
