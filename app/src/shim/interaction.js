// Window dragging and click-through.
//
// Konfabulator gave widgets both for free: the engine dragged the window when
// you pressed anywhere that wasn't an interactive element, and the window was
// shaped so clicks outside the artwork fell through to whatever was behind.
// Neither exists in a frameless Electron window, and the ported code never
// implemented them because it never had to.
//
// Dragging deliberately uses setPosition rather than -webkit-app-region:drag,
// because app-region swallows every event on the dragged element — the start
// button and the round buttons would stop responding.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	// --- dragging -----------------------------------------------------------

	let dragging = false;
	let lastScreenX = 0;
	let lastScreenY = 0;
	let movedWhileDown = false;

	// An element is a drag handle unless the thing actually under the cursor
	// wants the press for itself.
	//
	// Only the hit element is consulted, not its ancestors: the widget nests
	// its controls inside frames that carry their own handlers, so walking
	// up the tree marks nearly everything interactive and the window stops
	// dragging anywhere.
	function isInteractive(target) {
		const k = target && target.__konObject;
		if (!k) return false;
		return typeof k.onMouseDown === 'function'
			|| typeof k.onMouseUp === 'function'
			|| typeof k.onMultiClick === 'function';
	}

	document.addEventListener('mousedown', (e) => {
		if (e.button !== 0) return;
		if (isInteractive(e.target)) return;
		dragging = true;
		movedWhileDown = false;
		lastScreenX = e.screenX;
		lastScreenY = e.screenY;
	}, true);

	document.addEventListener('mousemove', (e) => {
		if (!dragging) return;
		const dx = e.screenX - lastScreenX;
		const dy = e.screenY - lastScreenY;
		if (dx === 0 && dy === 0) return;
		movedWhileDown = true;
		lastScreenX = e.screenX;
		lastScreenY = e.screenY;
		if (host.moveBy) host.moveBy(dx, dy);
	}, true);

	document.addEventListener('mouseup', () => {
		if (!dragging) return;
		dragging = false;
		if (movedWhileDown) saveWindowLocation();
	}, true);

	// The original stores the window position in a preference as "x,y" and
	// restores it on the next launch.
	function saveWindowLocation() {
		if (!host.getPosition) return;
		host.getPosition().then((pos) => {
			if (!pos) return;
			globalThis.preferences.windowLocation.value = `${Math.round(pos[0])},${Math.round(pos[1])}`;
		});
	}

	globalThis.konSaveWindowLocation = saveWindowLocation;

	// --- click-through ------------------------------------------------------
	//
	// The widget is an irregular shape inside a rectangular window. Without
	// this the transparent corners still swallow clicks meant for whatever is
	// behind. Electron can only toggle the whole window, so the renderer
	// tracks whether the cursor is over actual artwork and tells the main
	// process to pass events through when it isn't.

	let ignoring = false;

	function setIgnore(next) {
		if (next === ignoring) return;
		ignoring = next;
		if (host.setIgnoreMouseEvents) host.setIgnoreMouseEvents(next);
	}

	// elementFromPoint returns the topmost element, but a fully transparent
	// pixel of an <img> still hit-tests, so the alpha has to be sampled.
	const alphaCanvas = document.createElement('canvas');
	alphaCanvas.width = 1;
	alphaCanvas.height = 1;
	const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });

	function isOpaqueAt(x, y) {
		const el = document.elementFromPoint(x, y);
		if (!el || el === document.documentElement || el === document.body) return false;

		// Text and canvases count as solid wherever they are.
		if (el.tagName !== 'IMG') return true;

		const rect = el.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return false;

		// Map the cursor onto the image's natural pixels.
		const nx = Math.floor(((x - rect.left) / rect.width) * (el.naturalWidth || rect.width));
		const ny = Math.floor(((y - rect.top) / rect.height) * (el.naturalHeight || rect.height));

		try {
			alphaCtx.clearRect(0, 0, 1, 1);
			alphaCtx.drawImage(el, nx, ny, 1, 1, 0, 0, 1, 1);
			return alphaCtx.getImageData(0, 0, 1, 1).data[3] > 8;
		} catch {
			// Treat an unreadable image as solid rather than making the
			// window unclickable.
			return true;
		}
	}

	document.addEventListener('mousemove', (e) => {
		// Never start ignoring mid-drag, or the window would be dropped.
		if (dragging) return;
		setIgnore(!isOpaqueAt(e.clientX, e.clientY));
	});

	globalThis.konSetClickThrough = setIgnore;

	// --- window sizing ------------------------------------------------------
	//
	// Konfabulator sized the window to its content automatically. Here the
	// OS window is fixed at creation, so it has to be resized to the bounding
	// box of whatever the widget has laid out — otherwise the drawer opens
	// into a window too small to show it, and the clipped time text at the
	// top is just the window edge.

	let lastW = 0;
	let lastH = 0;
	let stagePadX = 0;
	let stagePadY = 0;

	function fitWindowToContent() {
		const stage = document.getElementById('stage');
		if (!stage) return;

		// Measure in the stage's own coordinate space, not the viewport's.
		// Measuring against the viewport makes the shift self-cancelling: the
		// pad moves everything, the next measurement no longer sees anything
		// negative, the pad resets, and it oscillates without ever sizing.
		const origin = stage.getBoundingClientRect();

		let minLeft = 0;
		let minTop = 0;
		let maxRight = 0;
		let maxBottom = 0;

		for (const el of stage.querySelectorAll('*')) {
			const cs = getComputedStyle(el);
			if (cs.visibility === 'hidden' || cs.display === 'none') continue;
			if (Number(cs.opacity) === 0) continue;
			const r = el.getBoundingClientRect();
			if (r.width === 0 || r.height === 0) continue;
			const left = r.left - origin.left;
			const top = r.top - origin.top;
			if (left < minLeft) minLeft = left;
			if (top < minTop) minTop = top;
			if (left + r.width > maxRight) maxRight = left + r.width;
			if (top + r.height > maxBottom) maxBottom = top + r.height;
		}

		// Some of the widget's own layout lands slightly above or left of its
		// origin — eventFrame sits at vOffset -1 — which the window edge
		// would clip. Offset the stage to bring it all inside.
		const padX = Math.ceil(-Math.min(0, minLeft));
		const padY = Math.ceil(-Math.min(0, minTop));
		if (padX !== stagePadX || padY !== stagePadY) {
			stagePadX = padX;
			stagePadY = padY;
			stage.style.left = `${padX}px`;
			stage.style.top = `${padY}px`;
		}

		// A little slack so anti-aliased edges aren't clipped.
		const w = Math.ceil(maxRight) + padX + 4;
		const h = Math.ceil(maxBottom) + padY + 4;
		// Guard against sizing to nothing while the widget is still building.
		if (w < 40 || h < 40) return;
		if (w === lastW && h === lastH) return;

		lastW = w;
		lastH = h;
		if (host.setSize) host.setSize(w, h);
	}

	globalThis.konFitWindowToContent = fitWindowToContent;

	// The layout settles over a few frames (images decode, the drawer
	// animates), and resizing is cheap, so re-check periodically rather than
	// trying to hook every mutation in the ported code.
	document.addEventListener('kon-widget-ready', () => {
		fitWindowToContent();
		setInterval(fitWindowToContent, 250);
	});
})();
