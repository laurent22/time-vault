// Decodes every skin image before any widget code runs.
//
// Konfabulator loaded images synchronously from the widget bundle: setting
// .src made the pixels available immediately, and the original relies on that
// twice over —
//
//   * for dimensions, which tools/gen-image-sizes.js already covers, and
//   * for drawing. MainWindow.js composites the info area, start button and
//     round buttons onto canvases in its constructor, with the images it has
//     only just created.
//
// An <img> whose file hasn't decoded draws nothing and raises no error, so
// without this every canvas-composited part of the skin silently came out
// blank — which is most of the widget's colour.
//
// This blocks startup until the skin is decoded. It's ~90 small PNGs from the
// local disk, so the wait is a few frames, and it buys the synchronous
// semantics the entire port is built on.

'use strict';

globalThis.KON_DECODED_IMAGES = new Map();

globalThis.konPreloadImages = async function konPreloadImages() {
	const table = globalThis.KON_IMAGE_SIZES || {};
	const paths = Object.keys(table);

	await Promise.all(paths.map((assetPath) => new Promise((resolve) => {
		// NativeImage, not Image: primitives.js has already replaced the
		// global Image with the Konfabulator one, which can't load a file.
		const img = new globalThis.NativeImage();
		// Resolve either way: a missing file shouldn't block startup.
		img.onload = () => {
			globalThis.KON_DECODED_IMAGES.set(assetPath, img);
			resolve();
		};
		img.onerror = () => {
			console.warn('[preload] failed to decode', assetPath);
			resolve();
		};
		// Never let one unreadable file stall startup.
		setTimeout(resolve, 10000);
		img.src = `../assets/${assetPath}`;
	})));

	return globalThis.KON_DECODED_IMAGES.size;
};
