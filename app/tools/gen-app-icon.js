#!/usr/bin/env electron
//
// Generates build/icon.png, the source electron-builder turns into .icns,
// .ico and the Linux icon set.
//
// The original artwork tops out at 128x128 — 2008 predates 512px icons, and
// the largest source in PSD/ is the same 128px. electron-builder requires at
// least 512x512 for macOS, so this upscales. It's bitmap art, so the result
// is soft; re-export from PSD/ if sharper assets are ever drawn.
//
// Usage: env -u ELECTRON_RUN_AS_NODE electron tools/gen-app-icon.js

'use strict';

const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE = path.join(__dirname, '..', 'assets', 'ProgramIcon.png');
const OUT_DIR = path.join(__dirname, '..', 'build');
const OUT = path.join(OUT_DIR, 'icon.png');
const SIZE = 512;

app.whenReady().then(() => {
	const source = nativeImage.createFromPath(SOURCE);
	if (source.isEmpty()) {
		console.error(`could not read ${SOURCE}`);
		app.exit(1);
		return;
	}

	const { width, height } = source.getSize();
	const resized = source.resize({ width: SIZE, height: SIZE, quality: 'best' });

	fs.mkdirSync(OUT_DIR, { recursive: true });
	fs.writeFileSync(OUT, resized.toPNG());

	console.log(`${path.relative(process.cwd(), SOURCE)} ${width}x${height}`
		+ ` -> ${path.relative(process.cwd(), OUT)} ${SIZE}x${SIZE}`);
	app.exit(0);
});
