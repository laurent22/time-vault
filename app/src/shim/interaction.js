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

		// The Window is the backdrop, not a control. It carries handlers of
		// its own (the context menu, and MainWindow's enter/exit tracking),
		// but a press landing on it means the cursor is over skin with no
		// control under it — which is precisely a drag. Since handler-less
		// elements became transparent to the mouse, most of the skin now
		// hit-tests through to the window, so treating it as interactive
		// stopped the widget being draggable anywhere.
		if (typeof Window === 'function' && k instanceof Window) return false;

		// onMouseDrag matters too: the resize button and the drawer's resize
		// anchor work by dragging, and letting the window move instead would
		// make them impossible to use.
		return typeof k.onMouseDown === 'function'
			|| typeof k.onMouseUp === 'function'
			|| typeof k.onMouseDrag === 'function'
			|| typeof k.onMultiClick === 'function';
	}

	document.addEventListener('mousedown', (e) => {
		if (e.button !== 0) return;
		if (isInteractive(e.target)) return;
		dragging = true;
		movedWhileDown = false;
		const useScreen = e.screenX !== 0 || e.screenY !== 0;
		lastScreenX = useScreen ? e.screenX : e.clientX;
		lastScreenY = useScreen ? e.screenY : e.clientY;
	}, true);

	document.addEventListener('mousemove', (e) => {
		if (!dragging) return;

		// Screen coordinates would be the natural choice, but synthesised
		// events leave them at zero, so the delta is taken from whichever
		// pair is actually populated. Client coordinates work because the
		// window moves with the cursor: the pointer stays put relative to
		// the page, and the residual difference is the drag distance.
		const useScreen = e.screenX !== 0 || e.screenY !== 0;
		const x = useScreen ? e.screenX : e.clientX;
		const y = useScreen ? e.screenY : e.clientY;

		const dx = x - lastScreenX;
		const dy = y - lastScreenY;
		if (dx === 0 && dy === 0) return;

		movedWhileDown = true;
		lastScreenX = x;
		lastScreenY = y;
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

	// True for a clipping container that currently shows none of its
	// children — it occupies space but draws nothing, so it shouldn't hold
	// the window open.
	function isEmptyClipper(el) {
		if (getComputedStyle(el).overflow === 'visible') return false;
		if (el.children.length === 0) return false;

		const box = el.getBoundingClientRect();
		for (const child of el.querySelectorAll('*')) {
			const cs = getComputedStyle(child);
			if (cs.visibility === 'hidden' || cs.display === 'none') continue;
			if (Number(cs.opacity) === 0) continue;
			const r = child.getBoundingClientRect();
			if (r.width === 0 || r.height === 0) continue;
			// Any overlap with the container means something is on screen.
			if (r.bottom > box.top && r.top < box.bottom
				&& r.right > box.left && r.left < box.right) {
				return false;
			}
		}
		return true;
	}

	// Intersect an element's rect with every clipping ancestor, so only the
	// visible part counts toward the window size. Returns null when nothing
	// of it is actually on screen.
	function clipToAncestors(el, rect) {
		let left = rect.left;
		let top = rect.top;
		let right = rect.right;
		let bottom = rect.bottom;

		for (let p = el.parentElement; p && p.id !== 'stage'; p = p.parentElement) {
			const cs = getComputedStyle(p);
			if (cs.overflow === 'visible') continue;
			const pr = p.getBoundingClientRect();
			if (pr.left > left) left = pr.left;
			if (pr.top > top) top = pr.top;
			if (pr.right < right) right = pr.right;
			if (pr.bottom < bottom) bottom = pr.bottom;
		}

		if (right <= left || bottom <= top) return null;
		return { left, top, width: right - left, height: bottom - top };
	}

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

			// A clipping container is a window onto its children, not content
			// in itself: the drawer container keeps its full height while the
			// drawer is slid up out of sight behind the widget, and counting
			// the container would hold the window open after it closed.
			if (isEmptyClipper(el)) continue;

			// An element inside a clipping ancestor only contributes the part
			// that's actually drawn. The drawer opens by sliding down from
			// vOffset -height behind the widget, and counting its full rect
			// would grow the window upward to follow something invisible.
			const box = clipToAncestors(el, r);
			if (!box) continue;

			const left = box.left - origin.left;
			const top = box.top - origin.top;
			if (left < minLeft) minLeft = left;
			if (top < minTop) minTop = top;
			if (left + box.width > maxRight) maxRight = left + box.width;
			if (top + box.height > maxBottom) maxBottom = top + box.height;
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
