// Checks the primitives shim against the Konfabulator semantics the ported
// layout code depends on. Runs in the renderer; see test/run-tests.js.

'use strict';

const results = [];

function check(name, fn) {
	try {
		const msg = fn();
		if (msg && typeof msg.then === 'function') {
			results.push({ name, ok: false, msg: 'test returned a Promise; the runner is synchronous' });
			return;
		}
		const ok = msg === undefined || msg === true;
		results.push({ name, ok, msg: ok ? undefined : String(msg) });
	} catch (e) {
		results.push({ name, ok: false, msg: `threw: ${e.message}` });
	}
}

// Returns undefined when equal, else a description. Values are rendered with
// a describe() that tolerates DOM nodes and cyclic shim objects.
function eq(actual, expected, what) {
	if (actual !== expected) return `${what}: got ${describe(actual)}, want ${describe(expected)}`;
}

function describe(v) {
	if (v === null) return 'null';
	if (v === undefined) return 'undefined';
	if (typeof v === 'string') return JSON.stringify(v);
	if (typeof v === 'object') {
		if (v.nodeName) return `<${v.nodeName.toLowerCase()}>`;
		return v.constructor ? `[${v.constructor.name}]` : '[object]';
	}
	return String(v);
}

check('hOffset/vOffset write through to CSS', () => {
	const f = new Frame();
	f.hOffset = 40;
	f.vOffset = 11;
	return eq(f.node.style.left, '40px', 'left')
		|| eq(f.node.style.top, '11px', 'top')
		|| eq(f.hOffset, 40, 'readback hOffset');
});

check('opacity is 0-255, converted to CSS 0-1', () => {
	const f = new Frame();
	f.opacity = 255;
	const full = f.node.style.opacity;
	f.opacity = 0;
	const none = f.node.style.opacity;
	f.opacity = 128;
	return eq(full, '1', 'opacity 255')
		|| eq(none, '0', 'opacity 0')
		|| eq(f.opacity, 128, 'readback keeps 0-255 scale')
		|| eq(Math.abs(parseFloat(f.node.style.opacity) - 128 / 255) < 0.001, true, 'opacity 128 -> ~0.502');
});

check('visible uses visibility so layout is preserved', () => {
	const f = new Frame();
	f.visible = false;
	return eq(f.node.style.visibility, 'hidden', 'hidden')
		|| eq(f.node.style.display, '', 'display untouched')
		|| eq(f.visible, false, 'readback');
});

check('tracking maps to pointer-events', () => {
	const f = new Frame();
	f.tracking = false;
	return eq(f.node.style.pointerEvents, 'none', 'pointer-events');
});

check('appendChild nests DOM and subviews together', () => {
	const parent = new Frame();
	const child = new Frame();
	parent.appendChild(child);
	return eq(parent.subviews.length, 1, 'subviews')
		|| eq(child.parentNode, parent, 'parentNode')
		|| eq(child.node.parentNode, parent.node, 'DOM parent')
		|| eq(parent.firstChild, child, 'firstChild');
});

check('appendChild reparents instead of duplicating', () => {
	const a = new Frame();
	const b = new Frame();
	const child = new Frame();
	a.appendChild(child);
	b.appendChild(child);
	return eq(a.subviews.length, 0, 'removed from old parent')
		|| eq(b.subviews.length, 1, 'added to new parent')
		|| eq(child.node.parentNode, b.node, 'DOM moved');
});

check('siblings resolve through the parent', () => {
	const p = new Frame();
	const a = new Frame();
	const b = new Frame();
	p.appendChild(a);
	p.appendChild(b);
	return eq(a.nextSibling, b, 'nextSibling')
		|| eq(b.previousSibling, a, 'previousSibling')
		|| eq(a.previousSibling, undefined, 'no previous for first');
});

check('removeChild detaches both views', () => {
	const p = new Frame();
	const c = new Frame();
	p.appendChild(c);
	p.removeChild(c);
	return eq(p.subviews.length, 0, 'subviews')
		|| eq(c.node.parentNode, null, 'DOM detached')
		|| eq(c.parentNode, null, 'parentNode cleared');
});

check('Image resolves bundle-relative paths to the asset copy', () => {
	const img = new Image();
	img.src = 'Resources/Skin/Default/BackgroundLeft.png';
	return eq(img.node.getAttribute('src'), '../assets/Skin/Default/BackgroundLeft.png', 'resolved path')
		|| eq(img.src, 'Resources/Skin/Default/BackgroundLeft.png', 'src reads back as the original value');
});

check('Image reports its size synchronously, before the file loads', () => {
	const img = new Image();
	img.src = 'Resources/Skin/Default/BackgroundLeft.png';
	// Not in the document and not decoded, but Konfabulator would already
	// know the size, so the shim must too.
	return eq(img.width, 53, 'width straight after setting src')
		|| eq(img.height, 89, 'height straight after setting src')
		|| eq(img.node.naturalWidth, 0, 'the DOM itself still reports 0');
});

check('Image explicit size overrides the natural one', () => {
	const img = new Image();
	img.src = 'Resources/Skin/Default/BackgroundLeft.png';
	img.width = 300;
	return eq(img.width, 300, 'explicit width wins')
		|| eq(img.height, 89, 'height still natural')
		|| eq(img.node.style.width, '300px', 'css width');
});

check('Image axes scale independently, without aspect-ratio lock', () => {
	// The 3-piece backgrounds stretch a 1px-wide slice horizontally and
	// expect its height to stay put. An <img> given only a CSS width keeps
	// its aspect ratio, which made these slices thousands of pixels tall.
	const img = new Image();
	img.src = 'Resources/Skin/Default/BackgroundRight_Middle.png'; // 1x89
	img.width = 97;
	document.body.appendChild(img.node);
	const r = img.node.getBoundingClientRect();
	img.node.remove();

	return eq(Math.round(r.width), 97, 'rendered width')
		|| eq(Math.round(r.height), 89, 'rendered height should stay at the natural 89');
});

check('Image with an unknown path falls back without throwing', () => {
	const img = new Image();
	img.src = 'Resources/Skin/Default/DoesNotExist.png';
	return eq(img.width, 0, 'unknown image reports 0');
});

check('zOrder maps to z-index', () => {
	const f = new Frame();
	f.zOrder = 5;
	return eq(f.node.style.zIndex, '5', 'z-index');
});

check('Canvas resize does not thrash the backing store', () => {
	const c = new Canvas();
	c.width = 100;
	c.height = 50;
	const ctx = c.getContext('2d');
	ctx.fillStyle = '#ff0000';
	ctx.fillRect(0, 0, 10, 10);
	// Re-assigning the same width must not clear the canvas.
	c.width = 100;
	const px = ctx.getImageData(5, 5, 1, 1).data;
	return eq(c.width, 100, 'width')
		|| eq(c.height, 50, 'height')
		|| eq(px[0], 255, 'red channel survived no-op resize')
		|| eq(px[3], 255, 'alpha survived no-op resize');
});

check('Canvas supports the 9-arg drawImage Imaging.js uses', () => {
	const c = new Canvas();
	c.width = 20;
	c.height = 20;
	const ctx = c.getContext('2d');
	return eq(typeof ctx.drawImage, 'function', 'drawImage present')
		|| eq(typeof ctx.clearRect, 'function', 'clearRect present');
});

check('Text measures itself when width is null', () => {
	const t = new Text();
	document.body.appendChild(t.node);
	t.style.fontSize = '22px';
	t.data = '12h 15m 17s';
	const measured = t.width;
	t.node.remove();
	return eq(measured > 0, true, `measured width should be > 0, got ${measured}`);
});

check('Text truncates when given an explicit width', () => {
	const t = new Text();
	t.width = 50;
	return eq(t.node.style.width, '50px', 'width')
		|| eq(t.node.style.textOverflow, 'ellipsis', 'ellipsis');
});

check('Text anchorStyle topLeft removes baseline shift', () => {
	const t = new Text();
	t.anchorStyle = 'topLeft';
	return eq(t.node.style.transform, '', 'no transform for topLeft');
});

check('mouse handlers assigned after construction still fire', () => {
	const f = new Frame();
	document.body.appendChild(f.node);
	let got = null;
	f.onMouseDown = function () { got = this; };
	f.node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
	f.node.remove();
	return eq(got, f, 'handler called with the Kon object as `this`');
});

check('onMouseExit fires on leave, not on child transitions', () => {
	const f = new Frame();
	document.body.appendChild(f.node);
	let exits = 0;
	f.onMouseExit = () => { exits++; };
	f.node.dispatchEvent(new MouseEvent('mouseleave'));
	f.node.remove();
	return eq(exits, 1, 'exit count');
});

check('resolveResource leaves absolute URLs alone', () => {
	return eq(resolveResource('http://example.com/a.png'), 'http://example.com/a.png', 'http')
		|| eq(resolveResource('data:image/png;base64,xx'), 'data:image/png;base64,xx', 'data');
});

window.__shimTestResults = results;
