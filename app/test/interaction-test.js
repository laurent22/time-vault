// Tests for the drag / click-through layer, which Konfabulator provided and
// the ported code therefore never implemented.

'use strict';

const ixResults = window.__shimTestResults || (window.__shimTestResults = []);

function ixCheck(name, fn) {
	try {
		const msg = fn();
		const ok = msg === undefined || msg === true;
		ixResults.push({ name, ok, msg: ok ? undefined : String(msg) });
	} catch (e) {
		ixResults.push({ name, ok: false, msg: `threw: ${e.message}` });
	}
}

ixCheck('every shim object back-references its DOM node', () => {
	// Drag handling and hit testing both resolve a node back to its
	// Konfabulator object through this.
	const f = new Frame();
	if (f.node.__konObject !== f) return 'Frame node is not tagged';
	const i = new Image();
	if (i.node.__konObject !== i) return 'Image node is not tagged';
});

ixCheck('rotation is applied as a CSS transform', () => {
	// MainWindow spins the screw image as the drawer opens; this was missing
	// entirely, so the rotation was silently dropped.
	const img = new Image();
	img.rotation = -90;
	if (img.rotation !== -90) return `readback ${img.rotation}`;
	if (!/rotate\(-90deg\)/.test(img.node.style.transform)) {
		return `transform is ${JSON.stringify(img.node.style.transform)}`;
	}
});

ixCheck('rotation composes with the text baseline transform', () => {
	const t = new Text();
	t.anchorStyle = 'baseline';
	t.rotation = 45;
	const tr = t.node.style.transform;
	if (!/translateY\(-100%\)/.test(tr)) return `lost the baseline shift: ${tr}`;
	if (!/rotate\(45deg\)/.test(tr)) return `lost the rotation: ${tr}`;
});

ixCheck('opacity is clamped to the Konfabulator range', () => {
	// The widget's own maths overshoots: MainWindow computes 177 + (1-p)*255,
	// which reaches 432.
	const f = new Frame();
	f.opacity = 432;
	if (f.opacity !== 255) return `over-range gave ${f.opacity}`;
	f.opacity = -20;
	if (f.opacity !== 0) return `under-range gave ${f.opacity}`;
});

ixCheck('hiding a container also hides children that set their own visibility', () => {
	// CSS visibility is inherited but a descendant can override it back.
	// Konfabulator never allowed that, and the drawer's dropdown list kept
	// rendering below the closed widget because of it.
	const parent = new Frame();
	const child = new Frame();
	parent.appendChild(child);
	document.body.appendChild(parent.node);

	child.visible = true;
	parent.visible = false;

	const clipped = getComputedStyle(parent.node).clipPath;
	const childVisible = child.node.getBoundingClientRect().width > 0
		&& getComputedStyle(parent.node).visibility === 'visible';

	parent.node.remove();

	if (childVisible) return 'child still visible through a hidden parent';
	if (!clipped || clipped === 'none') return `parent is not clipped: ${clipped}`;
});

ixCheck('a hidden element keeps its box so layout can measure it', () => {
	// The ported code reads offsets off hidden elements, so they must not
	// collapse the way display:none would.
	const f = new Frame();
	f.width = 100;
	f.height = 40;
	f.visible = false;
	document.body.appendChild(f.node);
	const r = f.node.getBoundingClientRect();
	f.node.remove();
	if (r.width !== 100 || r.height !== 40) return `box collapsed to ${r.width}x${r.height}`;
});

ixCheck('a hidden element stops tracking the mouse', () => {
	const f = new Frame();
	f.tracking = true;
	f.visible = false;
	if (f.node.style.pointerEvents !== 'none') {
		return `pointer-events is ${f.node.style.pointerEvents}`;
	}
});

ixCheck('widget.locale reduces a full tag to a shipped language', () => {
	// navigator.language is "fr-FR"; the resource folders are en/fr/tr.
	const l = widget.locale;
	if (!['en', 'fr', 'tr'].includes(l)) return `got ${JSON.stringify(l)}`;
});

ixCheck('extractFile returns a copy, not the asset itself', () => {
	// Callers delete the result — Localization.js does — so returning the
	// real path deleted the shipped strings files.
	const real = 'Resources/en/Localizable.strings';
	const extracted = widget.extractFile(real);
	if (!extracted) return 'extractFile returned nothing';
	if (extracted.endsWith('assets/en/Localizable.strings')) {
		return 'extractFile handed back the asset itself';
	}
	if (!filesystem.itemExists(extracted)) return 'the extracted copy does not exist';
	// Deleting the copy must leave the original alone.
	filesystem.remove(extracted);
	if (!filesystem.itemExists(real)) return 'deleting the copy removed the original';
});

ixCheck('filesystem.remove refuses to delete bundled assets', () => {
	const asset = 'Resources/en/Localizable.strings';
	const removed = filesystem.remove(asset);
	if (removed !== false) return 'remove() should refuse and return false';
	if (!filesystem.itemExists(asset)) return 'the asset was deleted anyway';
});

ixCheck('elements without a mouse handler are transparent to clicks', () => {
	// Konfabulator only hit-tested elements that had a handler; everything
	// else let the press fall through. In the DOM every element hit-tests,
	// so decorative overlays — BackgroundLeftHL sitting over the start
	// button, the icons over the round buttons — swallowed every click and
	// none of the controls worked.
	const plain = new Image();
	plain.src = 'Resources/Skin/Default/Screw.png';
	if (plain.node.style.pointerEvents !== 'none') {
		return `a handler-less image should not hit-test, got ${plain.node.style.pointerEvents}`;
	}

	plain.onMouseDown = () => {};
	if (plain.node.style.pointerEvents !== 'auto') {
		return 'assigning a handler should make it hit-test';
	}
});

ixCheck('an interactive frame covers its children so it can be clicked', () => {
	// RoundButton puts its handlers on a frame and its pixels on child
	// images. A zero-size frame has nothing to click.
	const frame = new Frame();
	frame.onMouseDown = () => {};

	const icon = new Image();
	icon.src = 'Resources/Skin/Default/RoundButtonBackground.png'; // 19x19
	frame.appendChild(icon);

	if (frame.node.style.pointerEvents !== 'auto') return 'the frame should hit-test';
	const w = parseInt(frame.node.style.width, 10);
	const h = parseInt(frame.node.style.height, 10);
	if (!(w >= 19) || !(h >= 19)) return `the frame did not cover its child: ${w}x${h}`;
});

ixCheck('onClick fires, which the round buttons depend on', () => {
	const f = new Frame();
	document.body.appendChild(f.node);
	let fired = 0;
	f.onClick = () => { fired++; };
	f.node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	f.node.remove();
	if (fired !== 1) return `onClick fired ${fired} times`;
});

ixCheck('a frame reports the extent of its children', () => {
	// MainWindow centres the clock with
	//   eventFrame.vOffset = (rightFrame.height - eventFrame.height) / 2 - 1
	// which collapses to -1 — pinning the text to the clipped top edge — if
	// an auto-sized frame reports null.
	const frame = new Frame();
	const a = new Image();
	a.src = 'Resources/Skin/Default/BackgroundLeft.png'; // 53x89
	a.hOffset = 10;
	a.vOffset = 5;
	frame.appendChild(a);

	if (frame.width !== 63) return `width should be 10+53=63, got ${frame.width}`;
	if (frame.height !== 94) return `height should be 5+89=94, got ${frame.height}`;
});

ixCheck('vAlign center shifts the element onto its offset', () => {
	// MainWindow positions the screw and the start button icon this way.
	const img = new Image();
	img.src = 'Resources/Skin/Default/Screw.png';
	img.vAlign = 'center';
	// The browser normalises the zero to 0px.
	if (!/translate\(0(px)?, -50%\)/.test(img.node.style.transform)) {
		return `transform is ${JSON.stringify(img.node.style.transform)}`;
	}
});

ixCheck('Image exposes srcWidth/srcHeight', () => {
	// Imaging.js's 9-slice drawRectangleImage divides by these to find its
	// corner size. Undefined makes that NaN and every drawImage silently
	// draws nothing — which left the whole drawer with no background.
	const img = new Image();
	img.src = 'Resources/Skin/Default/DrawerBackground.png'; // 144x304
	if (img.srcWidth !== 144) return `srcWidth ${img.srcWidth}`;
	if (img.srcHeight !== 304) return `srcHeight ${img.srcHeight}`;
});

ixCheck('srcWidth survives an explicit size override', () => {
	// srcWidth is the file's own size; width is what it's stretched to.
	const img = new Image();
	img.src = 'Resources/Skin/Default/DrawerBackground.png';
	img.width = 400;
	img.height = 300;
	if (img.srcWidth !== 144) return `srcWidth became ${img.srcWidth}`;
	if (img.width !== 400) return `width should be the override, got ${img.width}`;
});

ixCheck('an explicitly sized frame clips its children', () => {
	// The drawer opens by animating from vOffset -height, sliding down from
	// behind the widget. Without clipping the whole drawer is visible above
	// the window for the length of the animation.
	const frame = new Frame();
	frame.width = 100;
	frame.height = 50;
	if (frame.node.style.overflow !== 'hidden') {
		return `a sized frame should clip, got ${JSON.stringify(frame.node.style.overflow)}`;
	}
});

ixCheck('an auto-sized frame does not clip', () => {
	const frame = new Frame();
	const child = new Image();
	child.src = 'Resources/Skin/Default/Screw.png';
	frame.appendChild(child);
	if (frame.node.style.overflow === 'hidden') {
		return 'an auto-sized frame should not clip its children';
	}
});

ixCheck('sizing a frame for hit-testing does not make it clip', () => {
	// An interactive frame is given a CSS size purely so there's something
	// to click; it's still logically auto-sized.
	const frame = new Frame();
	frame.onMouseDown = () => {};
	const icon = new Image();
	icon.src = 'Resources/Skin/Default/RoundButtonBackground.png';
	frame.appendChild(icon);
	if (frame.node.style.overflow === 'hidden') {
		return 'the hit area should not start clipping the children';
	}
});

ixCheck('popupMenu exists and fires the chosen item', () => {
	// The [+] button, the project name and WidGUI's dropdown lists all call
	// popupMenu. Without it they silently did nothing — no task menu, and no
	// way to pick a project in the drawer.
	if (typeof globalThis.popupMenu !== 'function') return 'popupMenu is not defined';
});

ixCheck('popupMenu passes the original item to onSelect', () => {
	// The widget hangs its own properties off menu items (__task, __event,
	// __project) and reads them back inside the handler, so onSelect has to
	// run against the original object rather than a serialised copy.
	const a = new MenuItem();
	a.title = 'first';
	const b = new MenuItem();
	b.title = 'second';
	b.__marker = 'carried through';

	let seen = null;
	b.onSelect = function () { seen = this.__marker; };

	// The host bridge is stubbed in the test runner to choose the last item.
	const index = popupMenu([a, b], 0, 0);
	if (index !== 1) return `expected the stub to choose index 1, got ${index}`;
	if (seen !== 'carried through') return `onSelect lost the item's own properties (${seen})`;
});

ixCheck('a frame sized on one axis takes the other from its content', () => {
	// WidGUI builds its controls by setting a width and letting the height
	// follow the contents. A frame of absolutely positioned children has no
	// intrinsic height, so the DOM box collapsed to zero and the control
	// vanished — this is what hid the drawer's project dropdown.
	const frame = new Frame();
	frame.width = 296;

	const bg = new Image();
	bg.src = 'Resources/Skin/Default/DropdownUp.png';
	bg.width = 296;
	bg.height = 16;
	frame.appendChild(bg);

	document.body.appendChild(frame.node);
	const r = frame.node.getBoundingClientRect();
	frame.node.remove();

	if (Math.round(r.width) !== 296) return `width ${r.width}`;
	if (Math.round(r.height) !== 16) return `height collapsed to ${r.height}, should follow the content`;
});

ixCheck('a partly sized frame only clips the axis it was given', () => {
	const frame = new Frame();
	frame.width = 100;
	const child = new Image();
	child.src = 'Resources/Skin/Default/Screw.png';
	frame.appendChild(child);
	// Clipping the content-derived axis would cut off children added later.
	if (getComputedStyle(frame.node).overflow === 'hidden') {
		return 'a half-sized frame should not clip';
	}
});

ixCheck('an empty text still reports a line height', () => {
	// MainDrawer advances its row cursor by each label's height. The
	// Description column is empty for most rows, and an empty string
	// collapses to zero in the DOM — which left the divider and the
	// Nouvelle tache / Tout supprimer buttons stacked on top of the list.
	const t = new Text();
	t.style.fontSize = '12px';
	t.data = '';
	document.body.appendChild(t.node);
	const empty = t.height;
	t.data = 'x';
	const filled = t.height;
	t.node.remove();

	if (!(empty > 0)) return `an empty text reported height ${empty}`;
	if (Math.abs(empty - filled) > 4) {
		return `empty (${empty}) should be about one line, like filled (${filled})`;
	}
});

ixCheck('text measures correctly while off-document', () => {
	// The ported layout runs during construction, before anything is in the
	// document, and the DOM reports zero for a detached element.
	const t = new Text();
	t.style.fontSize = '22px';
	t.data = '00:00:00';
	// Deliberately not appended anywhere.
	if (!(t.height > 0)) return `detached height was ${t.height}`;
	if (!(t.width > 0)) return `detached width was ${t.width}`;
});

ixCheck('alert returns a 1-based button index', () => {
	// Konfabulator numbered buttons from 1 and the widget depends on it:
	// "if (answer == 2) return;" is how Delete All cancels. Returning
	// Electron's 0-based index made "No" read as 1, so it deleted anyway.
	// The runner's stub mirrors the host, which adds one.
	const n = alert('test', 'Yes', 'No');
	if (n < 1) return `got ${n}; the first button must be 1, not 0`;
});

ixCheck('orderAbove(null) brings an element to the front', () => {
	// WidGUI calls this to lift a button's label above the background it
	// just drew. Ignoring a null sibling left every TextButton label painted
	// underneath its own artwork — the drawer's tabs looked blank.
	const parent = new Frame();
	const label = new Frame();
	const background = new Frame();
	parent.appendChild(label);
	parent.appendChild(background);

	if (parent.subviews[1] !== background) return 'setup: background should start last';
	label.orderAbove(null);

	if (parent.subviews[parent.subviews.length - 1] !== label) {
		return 'the label is not last in the subview list';
	}
	if (parent.node.lastElementChild !== label.node) {
		return 'the label is not last in the DOM, so it still paints underneath';
	}
});

ixCheck('orderBelow(null) sends an element to the back', () => {
	const parent = new Frame();
	const a = new Frame();
	const b = new Frame();
	parent.appendChild(a);
	parent.appendChild(b);
	b.orderBelow(null);
	if (parent.node.firstElementChild !== b.node) return 'b should now paint first';
});

ixCheck('a frame with a scrollbar can scroll its contents', () => {
	// MainDrawer attaches one with infoFrame.vScrollBar = ...; without it a
	// long event list just ran off the bottom of the drawer.
	const frame = new Frame();
	frame.width = 100;
	frame.height = 50;

	const tall = new Frame();
	tall.width = 100;
	tall.height = 200;
	frame.appendChild(tall);

	const bar = new ScrollBar();
	frame.vScrollBar = bar;

	document.body.appendChild(frame.node);
	bar.value = 40;
	if (typeof bar.onScroll === 'function') bar.onScroll();
	const scrolled = frame.node.scrollTop;
	frame.node.remove();

	if (frame.vScrollBar !== bar) return 'the scrollbar was not attached';
	if (scrolled !== 40) return `scrollTop is ${scrolled}, expected 40`;
});

ixCheck('a context menu handler gets its items shown', () => {
	// Konfabulator's contract: onContextMenu fills in contextMenuItems and
	// the engine shows that menu once the handler returns. Storing the
	// array without showing it left right-click dead on the event rows, the
	// project list and the widget itself.
	const f = new Frame();
	document.body.appendChild(f.node);

	let built = false;
	f.onContextMenu = function () {
		built = true;
		const it = new MenuItem();
		it.title = 'Delete';
		this.contextMenuItems = [it];
	};

	f.node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
	f.node.remove();

	if (!built) return 'the handler never ran';
});

ixCheck('contextMenuItems is cleared before each handler runs', () => {
	// Otherwise a handler that decides against a menu would show the one
	// built on the previous right-click.
	const f = new Frame();
	document.body.appendChild(f.node);

	let seen = null;
	f.onContextMenu = function () {
		seen = this.contextMenuItems.length;
		const it = new MenuItem();
		it.title = 'one';
		this.contextMenuItems = [it];
	};

	f.node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
	f.node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
	f.node.remove();

	if (seen !== 0) return `the second handler saw ${seen} stale items`;
});
