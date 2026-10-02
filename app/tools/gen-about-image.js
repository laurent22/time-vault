#!/usr/bin/env node
//
// Generates assets/AboutBackground.png from the original Resources/About.png
// by painting out the Pogopixels logo in the lower strip.
//
// The original artwork is kept untouched in Contents/ and in assets as
// About.png; this derives a version without the branding, which no longer
// applies — the port isn't a Pogopixels product.
//
// The strip is a pure horizontal gradient: every row is one colour all the
// way across, verified before writing this. So a clean column copied over
// the logo's area is indistinguishable from the rest.
//
// Run with Electron, not node — it uses nativeImage:
//   npm run gen

'use strict';

const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ASSETS = path.join(__dirname, '..', 'assets');
const SOURCE = path.join(ASSETS, 'About.png');
const OUT = path.join(ASSETS, 'AboutBackground.png');

// The logo's bounding box within the lower strip, measured from the artwork.
const LOGO = { left: 18, top: 108, right: 170, bottom: 170 };
// A column well clear of the logo, whose colours are copied across.
const CLEAN_X = 320;

app.whenReady().then(() => {
	const img = nativeImage.createFromPath(SOURCE);
	if (img.isEmpty()) {
		console.error(`could not read ${path.relative(process.cwd(), SOURCE)}`);
		app.exit(1);
		return;
	}

	const { width, height } = img.getSize();
	const bmp = Buffer.from(img.toBitmap()); // BGRA

	for (let y = LOGO.top; y < Math.min(LOGO.bottom, height); y++) {
		const src = (y * width + CLEAN_X) * 4;
		for (let x = LOGO.left; x < Math.min(LOGO.right, width); x++) {
			const dst = (y * width + x) * 4;
			bmp[dst] = bmp[src];
			bmp[dst + 1] = bmp[src + 1];
			bmp[dst + 2] = bmp[src + 2];
			bmp[dst + 3] = bmp[src + 3];
		}
	}

	const out = nativeImage.createFromBitmap(bmp, { width, height });
	fs.writeFileSync(OUT, out.toPNG());
	console.log(`wrote ${path.basename(OUT)} (${width}x${height}), logo painted out`);

	app.exit(0);
});
