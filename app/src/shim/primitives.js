// Konfabulator drawing primitives, reimplemented over the DOM.
//
// The original widget positions every element absolutely, in pixels, against
// its parent. That maps onto absolutely-positioned divs almost one-to-one,
// which is the whole reason the 2,700 lines of layout code in MainWindow.js
// and MainDrawer.js can be ported nearly unchanged.
//
// Conventions carried over from Konfabulator, and the places they differ:
//
//   hOffset / vOffset   left / top, in pixels, relative to the parent frame.
//   opacity             0-255, NOT CSS's 0-1. Converted in the setter so the
//                       ported code keeps reading and writing the original
//                       scale.
//   zOrder              paint order within the parent; maps to z-index.
//   visible             true/false; maps to visibility, not display, so that
//                       a hidden element still occupies its position (the
//                       original relies on hidden elements keeping layout).
//   tracking            whether the element receives mouse events; maps to
//                       pointer-events.
//
// Every object exposes a .node (its DOM element) so the shim can nest them.

'use strict';

// The mouse handlers Konfabulator dispatched. An element with none of them
// assigned is transparent to the mouse, as it was in the original.
const MOUSE_HANDLERS = [
	'onMouseDown', 'onMouseUp', 'onMouseMove',
	'onMouseEnter', 'onMouseExit', 'onMouseWheel',
	'onMouseDrag', 'onMultiClick', 'onContextMenu', 'onClick',
];

// Elements that are moving under their own power, and so must not report
// hover while they do.
//
// The DOM fires mouseenter whenever the pointer and the element come to
// overlap — including when the element arrives at a stationary pointer.
// Konfabulator only reported the cursor entering something. The drawer
// slides up from below when it opens, so every row passed beneath the
// pointer, lit its hover overlay, and never got a matching mouseleave
// because the pointer hadn't moved: opening the drawer highlighted most of
// the list.
//
// Rather than guess from pointer timing or geometry, the code that moves
// something says so. konSetMouseGate(frame, true) while it animates.
const mouseGated = new Set();

function mouseGateClosedFor(node) {
	if (mouseGated.size === 0) return false;
	for (let el = node; el; el = el.parentElement) {
		if (mouseGated.has(el)) return true;
	}
	return false;
}

// Opens or closes the gate for an element and everything inside it.
// Takes a shim object or a DOM node.
globalThis.konSetMouseGate = function konSetMouseGate(target, closed) {
	const node = target && target.node ? target.node : target;
	if (!node) return;
	if (closed) mouseGated.add(node);
	else mouseGated.delete(node);
};

// --- shared base ----------------------------------------------------------

class KonObject {
	constructor(node) {
		this.node = node;
		// Back-reference so DOM-level code (drag handling, hit testing) can
		// find the Konfabulator object a node belongs to.
		this.node.__konObject = this;
		this.node.style.position = 'absolute';
		this.node.style.left = '0px';
		this.node.style.top = '0px';

		this._hOffset = 0;
		this._vOffset = 0;
		this._opacity = 255;
		this._visible = true;
		this._zOrder = 0;
		this._tracking = true;
		this._name = '';
		this._id = '';
		this._tooltip = '';
		this._parent = null;
		// Filled in by an onContextMenu handler; shown once it returns.
		this.contextMenuItems = [];

		this.subviews = [];

		this._installMouseEvents();
	}

	get hOffset() { return this._hOffset; }
	set hOffset(v) {
		this._hOffset = Number(v) || 0;
		this.node.style.left = `${this._hOffset}px`;
	}

	get vOffset() { return this._vOffset; }
	set vOffset(v) {
		this._vOffset = Number(v) || 0;
		this.node.style.top = `${this._vOffset}px`;
	}

	// Konfabulator opacity is 0-255. CSS wants 0-1. The widget's own maths
	// overshoots the range in places (MainWindow's eventFrame reaches 432),
	// which Konfabulator clamped, so clamp here rather than emitting an
	// out-of-range CSS value.
	get opacity() { return this._opacity; }
	set opacity(v) {
		const n = Number(v);
		this._opacity = Math.max(0, Math.min(255, Number.isFinite(n) ? n : 0));
		this.node.style.opacity = String(this._opacity / 255);
	}

	// Konfabulator rotated about the element's centre, in degrees.
	// MainWindow spins the screw image as the drawer opens.
	get rotation() { return this._rotation || 0; }
	set rotation(v) {
		const n = Number(v);
		this._rotation = Number.isFinite(n) ? n : 0;
		this._applyTransform();
	}

	_applyTransform() {
		const parts = [];
		// Alignment shifts the box, so it has to come before the rotation,
		// which then spins about the aligned position.
		if (this._baseTransform) parts.push(this._baseTransform);
		if (this._alignTransform) parts.push(this._alignTransform);
		if (this._rotation) parts.push(`rotate(${this._rotation}deg)`);
		this.node.style.transform = parts.join(' ');
	}

	get visible() { return this._visible; }
	set visible(v) {
		this._visible = !!v;
		// CSS visibility is inherited but a descendant can override it back
		// to visible, which Konfabulator never allowed — hiding a container
		// hid everything in it. The drawer's dropdown list sets its own
		// visibility and so kept rendering below the closed widget.
		// 'collapse' can't be overridden by descendants on non-table
		// elements in Blink, but it's not portable, so clip instead: the
		// element keeps its box (layout code reads offsets off hidden
		// elements) while nothing inside it can paint.
		if (this._visible) {
			this.node.style.visibility = 'visible';
			this.node.style.clipPath = this._baseClip || '';
		} else {
			this.node.style.visibility = 'hidden';
			this.node.style.clipPath = 'inset(50%)';
		}
		this._refreshPointerEvents();
	}

	get zOrder() { return this._zOrder; }
	set zOrder(v) {
		this._zOrder = Number(v) || 0;
		this.node.style.zIndex = String(this._zOrder);
	}

	get tracking() { return this._tracking; }
	set tracking(v) {
		this._tracking = !!v;
		this._refreshPointerEvents();
	}

	// Konfabulator's hAlign/vAlign say which point of the element hOffset and
	// vOffset refer to: "center" means the offsets address its centre, not
	// its top-left. MainWindow positions the screw and the start button's
	// icon that way, so without this they sit half their size too far down
	// and to the right.
	get hAlign() { return this._hAlign || 'left'; }
	set hAlign(v) {
		this._hAlign = v;
		this._applyAlign();
	}

	get vAlign() { return this._vAlign || 'top'; }
	set vAlign(v) {
		this._vAlign = v;
		this._applyAlign();
	}

	_applyAlign() {
		const x = this._hAlign === 'center' ? '-50%' : (this._hAlign === 'right' ? '-100%' : '0');
		const y = this._vAlign === 'center' ? '-50%' : (this._vAlign === 'bottom' ? '-100%' : '0');
		this._alignTransform = (x === '0' && y === '0') ? '' : `translate(${x}, ${y})`;
		this._applyTransform();
	}

	get tooltip() { return this._tooltip; }
	set tooltip(v) {
		this._tooltip = v == null ? '' : String(v);
		this.node.title = this._tooltip;
	}

	// Not a Konfabulator property. The 2008 engine gave the whole widget one
	// arrow cursor and offered no way to change it, so the original has
	// nothing to port here — but the ported widget has clickable text that
	// looks exactly like the labels beside it, and in a browser-shaped
	// runtime a pointer cursor is what tells them apart.
	get cursor() { return this._cursor || ''; }
	set cursor(v) {
		this._cursor = v == null ? '' : String(v);
		this.node.style.cursor = this._cursor;
	}

	get name() { return this._name; }
	set name(v) { this._name = v; }

	get id() { return this._id; }
	set id(v) { this._id = v; }

	// --- tree ---------------------------------------------------------------

	get parentNode() { return this._parent; }
	get superview() { return this._parent; }

	get firstChild() { return this.subviews[0]; }
	get lastChild() { return this.subviews[this.subviews.length - 1]; }

	get nextSibling() {
		if (!this._parent) return undefined;
		const s = this._parent.subviews;
		return s[s.indexOf(this) + 1];
	}

	get previousSibling() {
		if (!this._parent) return undefined;
		const s = this._parent.subviews;
		return s[s.indexOf(this) - 1];
	}

	appendChild(child) {
		if (!child) return;
		if (child._parent) child._parent.removeChild(child);
		child._parent = this;
		this.subviews.push(child);
		this.node.appendChild(child.node);
		// An interactive frame's clickable area is its children's bounds, and
		// a partly-sized frame takes its other axis from them — both change
		// when a child arrives. WidGUI builds its controls this way round:
		// set the width first, then add the contents.
		this._refreshPointerEvents();
		if (typeof this._applyClipping === 'function') this._applyClipping();
	}

	removeChild(child) {
		if (!child) return;
		const i = this.subviews.indexOf(child);
		if (i !== -1) this.subviews.splice(i, 1);
		if (child.node.parentNode === this.node) this.node.removeChild(child.node);
		child._parent = null;
	}

	// Konfabulator's view-oriented aliases, used by WidGUI.
	addSubview(child) { this.appendChild(child); }

	removeSubview(child) { this.removeChild(child); }

	removeFromSuperview() {
		if (this._parent) this._parent.removeChild(this);
	}

	// Z-ordering. Konfabulator ordered siblings by their position in the
	// parent's subview list, which is also how the DOM paints them, so this
	// reorders both lists together rather than touching z-index.
	orderAbove(sibling) { this._reorderRelativeTo(sibling, 'above'); }

	orderBelow(sibling) { this._reorderRelativeTo(sibling, 'below'); }

	_reorderRelativeTo(sibling, where) {
		const parent = this._parent;
		if (!parent) return;

		const list = parent.subviews;
		const from = list.indexOf(this);
		if (from !== -1) list.splice(from, 1);

		// A null sibling means the extremes of the stack — WidGUI calls
		// orderAbove(null) to bring a button's label in front of the
		// background it just drew. Ignoring that left every TextButton and
		// DropdownList label painted underneath its own artwork, which is
		// why the drawer's tabs looked like blank white buttons.
		if (!sibling || sibling._parent !== parent) {
			if (where === 'above') {
				list.push(this);
				parent.node.appendChild(this.node);
			} else {
				list.unshift(this);
				parent.node.prepend(this.node);
			}
			return;
		}

		const target = list.indexOf(sibling);
		list.splice(where === 'above' ? target + 1 : target, 0, this);

		// Mirror the new order in the DOM: "above" means painted later.
		if (where === 'above') {
			sibling.node.after(this.node);
		} else {
			sibling.node.before(this.node);
		}
	}

	// --- events -------------------------------------------------------------
	//
	// Konfabulator exposes handlers as assignable properties (obj.onMouseDown =
	// fn) and calls them with the object as `this`. Wired once in the
	// constructor so assigning a handler later still works.

	// Konfabulator only sent mouse events to elements that had a handler for
	// them; anything else was transparent and the press fell through to
	// whatever was underneath. In the DOM every element hit-tests, so the
	// decorative overlays drawn on top of the controls — BackgroundLeftHL
	// over the start button, the icon images over the round buttons — were
	// swallowing every click and nothing worked.
	//
	// Handlers are assigned after construction, so this can't be decided
	// once; pointer-events is updated whenever one is added or removed.
	_refreshPointerEvents() {
		if (!this._visible || !this._tracking) {
			this.node.style.pointerEvents = 'none';
			return;
		}

		const interactive = this._hasMouseHandler();
		this.node.style.pointerEvents = interactive ? 'auto' : 'none';

		// A frame is a zero-size container: its children carry the pixels.
		// If it's the one with the handler — which is how RoundButton and
		// the drawer's controls are built — it has to cover its children or
		// there's nothing to click. Konfabulator hit-tested a frame against
		// its contents' bounds, so this reproduces that.
		if (interactive && this._width == null && this._height == null) {
			const { width, height } = this._measureChildren();
			if (width > 0 && height > 0) {
				this.node.style.width = `${width}px`;
				this.node.style.height = `${height}px`;
				// This size exists only so there's something to click. The
				// frame is still logically auto-sized, so it must not start
				// clipping its children the way an explicitly sized one does.
				this.node.style.overflow = 'visible';
			}
		}
	}

	// Bounds of this element's children, in its own coordinate space.
	_measureChildren() {
		let width = 0;
		let height = 0;
		for (const child of this.subviews) {
			if (child._visible === false) continue;
			const right = (Number(child.hOffset) || 0) + (Number(child.width) || 0);
			const bottom = (Number(child.vOffset) || 0) + (Number(child.height) || 0);
			if (right > width) width = right;
			if (bottom > height) height = bottom;
		}
		return { width, height };
	}

	_hasMouseHandler() {
		for (const name of MOUSE_HANDLERS) {
			if (typeof this[name] === 'function') return true;
		}
		// A container with interactive children must stay hit-testable, but
		// pointer-events:none on a parent doesn't stop children receiving
		// events, so there's nothing extra to do here.
		return false;
	}

	_installMouseEvents() {
		// Watch for handlers being assigned so pointer-events can follow.
		for (const name of MOUSE_HANDLERS) {
			let stored;
			Object.defineProperty(this, name, {
				configurable: true,
				enumerable: true,
				get: () => stored,
				set: (fn) => {
					stored = fn;
					this._refreshPointerEvents();
				},
			});
		}
		this._refreshPointerEvents();

		const fire = (name, e) => {
			const fn = this[name];
			if (typeof fn === 'function') fn.call(this, e);
		};

		this.node.addEventListener('mousedown', (e) => fire('onMouseDown', e));
		this.node.addEventListener('mouseup', (e) => fire('onMouseUp', e));
		this.node.addEventListener('mousemove', (e) => fire('onMouseMove', e));
		// Konfabulator's enter/exit don't bubble from children, which is what
		// mouseenter/mouseleave give us (unlike mouseover/mouseout).
		// Enters are dropped while an ancestor is marked as moving — see
		// konSetMouseGate. The DOM fires mouseenter when an element slides
		// *under* a stationary cursor, which Konfabulator never did: it
		// reported the cursor entering something, not something arriving
		// under the cursor.
		this.node.addEventListener('mouseenter', (e) => {
			if (mouseGateClosedFor(this.node)) return;
			fire('onMouseEnter', e);
		});
		this.node.addEventListener('mouseleave', (e) => fire('onMouseExit', e));
		this.node.addEventListener('wheel', (e) => fire('onMouseWheel', e));

		// onMouseDrag has no DOM equivalent: Konfabulator sent it while the
		// button was held, whether or not the cursor was still over the
		// element. The resize button and the drawer's resize anchor are
		// driven entirely by it, so it's synthesised here — listening on the
		// document, since the pointer routinely leaves the small control
		// being dragged.
		this.node.addEventListener('mousedown', (e) => {
			if (e.button !== 0) return;
			if (typeof this.onMouseDrag !== 'function') return;

			const onMove = (moveEvent) => {
				// system.event is kept current by the capture-phase listener
				// in shim/filesystem.js, which also handles the screen
				// coordinate fallback; the handler reads it rather than
				// taking the event as an argument.
				this.onMouseDrag(moveEvent);
			};
			const onUp = () => {
				document.removeEventListener('mousemove', onMove, true);
				document.removeEventListener('mouseup', onUp, true);
			};

			document.addEventListener('mousemove', onMove, true);
			document.addEventListener('mouseup', onUp, true);
		});
		// Konfabulator's contract: the handler fills in contextMenuItems and
		// the engine shows that menu once it returns. Without the second
		// half, right-clicking the event rows, the project list and the
		// widget itself all did nothing.
		//
		// Only the innermost element with items wins — stopPropagation keeps
		// a row's menu from being replaced by the window's.
		this.node.addEventListener('contextmenu', (e) => {
			const handler = this.onContextMenu;
			if (typeof handler !== 'function') return;

			e.preventDefault();
			e.stopPropagation();

			// Cleared first so a handler that decides against a menu this
			// time doesn't show the previous one.
			this.contextMenuItems = [];
			handler.call(this, e);

			const items = this.contextMenuItems;
			if (!items || items.length === 0) return;
			if (typeof globalThis.popupMenu === 'function') {
				globalThis.popupMenu(items, e.clientX, e.clientY);
			}
		});

		// Konfabulator's onClick: a press and release on the same element.
		// RoundButton drives the expand and resize buttons through it.
		this.node.addEventListener('click', (e) => fire('onClick', e));

		this.node.addEventListener('dblclick', (e) => {
			const fn = this.onMultiClick;
			if (typeof fn === 'function') fn.call(this, e);
		});
	}
}

// --- Frame ----------------------------------------------------------------
// A plain container. Konfabulator frames clip their children only when
// explicitly sized, which is why width/height default to unset here.

class Frame extends KonObject {
	constructor() {
		super(document.createElement('div'));
		this._width = null;
		this._height = null;
	}

	// Konfabulator frames auto-sized to their contents: reading .height on a
	// frame with no explicit size gave the extent of its children, not null.
	// The layout depends on it — MainWindow centres the clock with
	//   eventFrame.vOffset = (rightFrame.height - eventFrame.height) / 2 - 1
	// which collapses to -1 if either side is null, pinning the text to the
	// top edge where the window clips it.
	get width() {
		if (this._width != null) return this._width;
		return this._measure().width;
	}
	set width(v) {
		this._width = v == null ? null : Number(v);
		this.node.style.width = this._width == null ? '' : `${this._width}px`;
		this._applyClipping();
	}

	get height() {
		if (this._height != null) return this._height;
		return this._measure().height;
	}
	set height(v) {
		this._height = v == null ? null : Number(v);
		this.node.style.height = this._height == null ? '' : `${this._height}px`;
		this._applyClipping();
	}

	// A Konfabulator frame clipped its children once it had an explicit
	// size; an auto-sized one didn't. The drawer depends on it: it opens by
	// animating from vOffset -height up behind the widget down to 0, and
	// without clipping the whole drawer is visible above the window for the
	// length of the animation.
	//
	// Clipping only applies on an axis that was actually given a size.
	// WidGUI sets a width and leaves the height to the content, and a frame
	// of absolutely positioned children has no intrinsic height — so without
	// backfilling the measured height the box collapsed to zero and the
	// control vanished (this is what hid the drawer's project dropdown).
	_applyClipping() {
		const hasW = this._width != null;
		const hasH = this._height != null;

		if (!hasW && !hasH) {
			this.node.style.overflow = '';
			return;
		}

		const measured = this._measureChildren();
		if (!hasW && measured.width > 0) this.node.style.width = `${measured.width}px`;
		if (!hasH && measured.height > 0) this.node.style.height = `${measured.height}px`;

		// Only clip where a size was actually asked for; the backfilled axis
		// is the content's own extent, so clipping it would be a no-op at
		// best and cut off later-added children at worst.
		this.node.style.overflow = (hasW && hasH) ? 'hidden' : 'visible';
	}

	// Measured from the shim objects rather than the DOM so it works before
	// the frame is in the document — the layout runs during construction.
	_measure() {
		return this._measureChildren();
	}

	// Konfabulator scrolled a frame's contents when a ScrollBar was attached
	// this way; the drawer uses it for both the event list and the project
	// list. Without it a long list simply ran off the bottom of the drawer.
	get vScrollBar() { return this._vScrollBar || null; }
	set vScrollBar(bar) {
		this._vScrollBar = bar || null;
		if (!bar) return;

		// Scroll by shifting the frame's own scroll origin rather than
		// writing transforms onto the children — they use transform for
		// alignment and rotation, and overwriting it would undo both.
		this.node.style.overflow = 'hidden';
		const apply = () => {
			this.node.scrollTop = Math.max(0, Number(bar.value) || 0);
		};

		bar.onScroll = apply;

		// The wheel scrolls the frame under the pointer, as it would in any
		// list; Konfabulator did this for a scrollable frame automatically.
		this.node.addEventListener('wheel', (e) => {
			const content = this._measureChildren().height;
			const visible = this._height != null ? this._height : content;
			const max = Math.max(0, content - visible);
			if (max <= 0) return;

			e.preventDefault();
			const next = Math.min(max, Math.max(0, (Number(bar.value) || 0) + e.deltaY));
			bar.maximum = max;
			bar.value = next;
			apply();
		}, { passive: false });

		apply();
	}
}

// --- Image ----------------------------------------------------------------

class Image extends KonObject {
	constructor() {
		super(document.createElement('img'));
		this._src = '';
		this._width = null;
		this._height = null;
		this._natural = null;
		// Skin art is 1x and must stay crisp.
		this.node.style.imageRendering = '-webkit-optimize-contrast';
		this.node.draggable = false;
	}

	// Konfabulator's srcWidth/srcHeight: the file's own dimensions, which
	// stay put when width/height are overridden to stretch the element.
	// Imaging.js's 9-slice drawRectangleImage divides by these to find its
	// corner size — undefined makes that NaN and every drawImage call
	// silently draws nothing, which left the drawer with no background.
	get srcWidth() {
		if (this._natural) return this._natural[0];
		return this.node.naturalWidth || 0;
	}

	get srcHeight() {
		if (this._natural) return this._natural[1];
		return this.node.naturalHeight || 0;
	}

	// The preloaded, already-decoded element for this source, if there is
	// one. Canvas drawing uses this rather than our own <img>, which may not
	// have decoded yet.
	get decodedNode() {
		const table = globalThis.KON_DECODED_IMAGES;
		return table ? table.get(assetKey(this._src)) : undefined;
	}

	get src() { return this._src; }
	set src(v) {
		this._src = v == null ? '' : String(v);
		this.node.src = resolveResource(this._src);
		this._natural = lookupImageSize(this._src);
		// A size set before src was assigned was sized against the wrong
		// natural dimensions.
		this._applySize();
	}

	// Konfabulator reports the natural size as soon as src is set, because it
	// loaded images synchronously from the bundle. The DOM reports 0 until the
	// image decodes, and the original layout code can't wait: e.g.
	// ThreePiecesRectangle reads imageLeft.width in its constructor to place
	// the middle slice. So prefer the generated size table, and fall back to
	// naturalWidth for anything not in it (once loaded).
	get width() {
		if (this._width != null) return this._width;
		if (this._natural) return this._natural[0];
		return this.node.naturalWidth || 0;
	}
	set width(v) {
		this._width = v == null ? null : Number(v);
		this._applySize();
	}

	get height() {
		if (this._height != null) return this._height;
		if (this._natural) return this._natural[1];
		return this.node.naturalHeight || 0;
	}
	set height(v) {
		this._height = v == null ? null : Number(v);
		this._applySize();
	}

	// Konfabulator scaled each axis independently: setting only the width of
	// a 1px-wide slice stretched it horizontally and left its height alone.
	// An <img> with a single CSS dimension preserves its aspect ratio
	// instead, which turned the 1px middle slices of the 3-piece backgrounds
	// into thousands of pixels tall. So whenever one axis is set explicitly,
	// the other is pinned to its natural size.
	_applySize() {
		const natural = this._natural || [this.node.naturalWidth, this.node.naturalHeight];

		if (this._width == null && this._height == null) {
			this.node.style.width = '';
			this.node.style.height = '';
			return;
		}

		const w = this._width != null ? this._width : natural[0];
		const h = this._height != null ? this._height : natural[1];
		this.node.style.width = `${w}px`;
		this.node.style.height = `${h}px`;
	}
}

// --- Text -----------------------------------------------------------------
// Konfabulator text has a `style` sub-object and an `anchorStyle` controlling
// which corner hOffset/vOffset refer to. The original uses "topLeft"
// everywhere except where it leaves the default (baseline-left), so both are
// supported.

class Text extends KonObject {
	constructor() {
		super(document.createElement('div'));
		this._data = '';
		this._anchorStyle = '';
		this._width = null;
		this._hAlign = 'left';
		this._color = null;

		this.node.style.whiteSpace = 'nowrap';
		// Konfabulator positioned text by its own box, and callers centre
		// that box inside their control — WidGUI's buttons do exactly that.
		// CSS reserves room for descenders whether or not the text has any,
		// so the visible glyphs end up sitting above the middle of the box
		// and the label looks top-aligned.
		//
		// Making the element a flex container centres the line box on the
		// element's own height, which puts the ink where the caller's
		// arithmetic expects it.
		//
		// The line height must be the font's own, not `1`. A line box exactly
		// one em tall cannot hold ascender and descender both, so the ink
		// overflows the element's box — a descender hung 1px below it at 11px
		// — and every caller that derives geometry from the box then cuts it
		// off: MainDrawer advances its row cursor by each label's height, so
		// the tail of a "p" or "g" landed in the next row and was clipped.
		//
		// This also replaces a `paddingTop: 0.11em` nudge that used to sit
		// here. That was compensating for an imbalance `line-height: 1`
		// created in the first place: with the font's own line height the ink
		// is already centred on the box to the pixel, at every size the widget
		// uses. Measured 11/12/22px: ink centred within 0.00px and nothing
		// below the box, against 0.35–0.96px low and up to 1.5px overhanging
		// before.
		this.node.style.lineHeight = 'normal';
		this.node.style.display = 'flex';
		this.node.style.alignItems = 'center';

		// Writing to text.style.fontSize etc. should hit the DOM directly.
		this.style = this.node.style;
	}

	get data() { return this._data; }
	set data(v) {
		this._data = v == null ? '' : String(v);
		this.node.textContent = this._data;
	}

	get color() { return this._color; }
	set color(v) {
		this._color = v;
		this.node.style.color = v;
	}

	get anchorStyle() { return this._anchorStyle; }
	set anchorStyle(v) {
		this._anchorStyle = v;
		// Default Konfabulator text is positioned by its baseline; "topLeft"
		// switches to the box's top-left, which is what CSS does natively.
		// Goes through _baseTransform so it composes with rotation rather
		// than overwriting it.
		this._baseTransform = v === 'topLeft' ? '' : 'translateY(-100%)';
		this._applyTransform();
	}

	get hAlign() { return this._hAlign; }
	set hAlign(v) {
		this._hAlign = v;
		this.node.style.textAlign = v;
	}

	// width = null means "shrink to content", which the original uses to
	// measure text before deciding whether to truncate it.
	get width() {
		if (this._width != null) return this._width;
		const rect = this.node.getBoundingClientRect();
		if (rect.width > 0) return Math.ceil(rect.width / stageScale());
		return measureText(this.node).width;
	}
	set width(v) {
		this._width = v == null ? null : Number(v);
		if (this._width == null) {
			this.node.style.width = '';
			this.node.style.overflow = '';
			this.node.style.textOverflow = '';
		} else {
			this.node.style.width = `${this._width}px`;
			this.node.style.overflow = 'hidden';
			this.node.style.textOverflow = 'ellipsis';
		}
	}

	// Konfabulator could measure text that wasn't on screen; the DOM reports
	// zero for a detached element. The layout runs during construction,
	// before anything is in the document, and MainDrawer advances its row
	// cursor by each label's height — so zero here stacked the list on top
	// of the buttons below it.
	get height() {
		const rect = this.node.getBoundingClientRect();
		// An empty string collapses the flex box, and a detached element
		// reports zero — neither is a real line, so anything this small falls
		// through to the line-height measurement below, which is what
		// MainDrawer's empty Description column needs.
		const unscaled = rect.height / stageScale();
		if (unscaled > 4) return Math.ceil(unscaled);

		const measured = measureText(this.node).height;
		if (measured > 4) return measured;

		// An empty string collapses to nothing in the DOM, but Konfabulator
		// still reported a line's height. MainDrawer advances its row cursor
		// by each label's height, and the Description column is empty for
		// most rows — zero there left the divider and buttons stacked on top
		// of the list.
		return measureLineHeight(this.node);
	}
}

// --- Canvas ---------------------------------------------------------------
// Konfabulator's canvas is close enough to the DOM's that Imaging.js, which
// does the original's 3-piece and 9-slice scaling with 9-argument drawImage
// calls, works against it unchanged.

class Canvas extends KonObject {
	constructor() {
		super(document.createElement('canvas'));
		this.node.width = 1;
		this.node.height = 1;
	}

	get width() { return this.node.width; }
	set width(v) {
		// Assigning to a canvas's width clears it, so avoid no-op writes.
		const w = Math.max(1, Math.round(Number(v) || 0));
		if (this.node.width !== w) this.node.width = w;
		this.node.style.width = `${w}px`;
	}

	get height() { return this.node.height; }
	set height(v) {
		const h = Math.max(1, Math.round(Number(v) || 0));
		if (this.node.height !== h) this.node.height = h;
		this.node.style.height = `${h}px`;
	}

	getContext(type) {
		const ctx = this.node.getContext(type || '2d');
		return wrapContext(ctx);
	}

	clear() {
		this.getContext('2d').clearRect(0, 0, this.node.width, this.node.height);
	}
}

// The zoom factor applied to the stage. getBoundingClientRect() reports
// post-transform pixels, but the ported layout works in unscaled ones — so
// every measurement taken from the live DOM has to be divided back down.
// Without this, zooming inflated every measured width and the controls that
// size themselves to their text grew with it.
function stageScale() {
	const stage = document.getElementById('stage');
	if (!stage) return 1;
	const t = stage.style.transform;
	if (!t) return 1;
	const m = /scale\(([^)]+)\)/.exec(t);
	const v = m ? parseFloat(m[1]) : 1;
	return Number.isFinite(v) && v > 0 ? v : 1;
}

// --- text measurement -----------------------------------------------------
// Konfabulator reported text metrics whether or not the element was on
// screen; the DOM reports zero for anything detached. The ported layout runs
// during construction, before any of it is in the document, so measurements
// are taken against a hidden host instead.

let measureHost = null;

function getMeasureHost() {
	if (!document.body) return null;
	if (!measureHost) {
		measureHost = document.createElement('div');
		measureHost.style.cssText =
			'position:absolute; left:-10000px; top:-10000px; visibility:hidden; pointer-events:none;';
		document.body.appendChild(measureHost);
	}
	return measureHost;
}

// The size this text would occupy if it were on screen.
function measureText(node) {
	const host = getMeasureHost();
	if (!host) return { width: 0, height: 0 };

	const clone = node.cloneNode(true);
	// Size to content, rather than inheriting the original's absolute
	// placement.
	clone.style.position = 'static';
	clone.style.left = '';
	clone.style.top = '';
	clone.style.visibility = 'visible';
	if (!node.style.width) clone.style.width = 'max-content';

	host.appendChild(clone);
	const rect = clone.getBoundingClientRect();
	host.removeChild(clone);

	return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
}

// The height of one line in this element's font. An empty string collapses
// to nothing in the DOM, but Konfabulator still reported a line's height —
// and MainDrawer advances its row cursor by each label's height, so an empty
// Description column would otherwise contribute zero and stack the buttons
// on top of the list.
function measureLineHeight(node) {
	const host = getMeasureHost();
	if (!host) return 0;

	const probe = document.createElement('div');
	probe.style.cssText = node.style.cssText;
	probe.style.position = 'static';
	probe.style.left = '';
	probe.style.top = '';
	probe.style.width = 'max-content';
	probe.style.visibility = 'visible';
	// A non-breaking space gives the line box without visible content.
	probe.textContent = '\u00a0';

	host.appendChild(probe);
	const h = Math.ceil(probe.getBoundingClientRect().height);
	host.removeChild(probe);
	return h;
}

// --- canvas context -------------------------------------------------------
// Konfabulator's drawImage took its own Image objects. The DOM needs the
// underlying <img>/<canvas> element, so the wrapper unwraps shim objects on
// the way through. Everything else is forwarded untouched.
//
// The context is wrapped once per canvas and cached, so repeated getContext()
// calls — Imaging.js calls it per redraw — don't allocate a new wrapper each
// time.

const contextCache = new WeakMap();

// Canvas drawing needs a decoded bitmap. The shim Image's own <img> element
// may not have decoded yet — the original composites in its constructors —
// so prefer the preloaded copy, which is guaranteed ready.
function unwrap(v) {
	if (!v) return v;
	if (v instanceof Image) {
		const decoded = v.decodedNode;
		if (decoded) return decoded;
	}
	return v.node ? v.node : v;
}

function wrapContext(ctx) {
	if (!ctx) return ctx;
	const cached = contextCache.get(ctx);
	if (cached) return cached;

	const wrapper = new Proxy(ctx, {
		get(target, prop) {
			const value = target[prop];
			if (typeof value !== 'function') return value;
			if (prop === 'drawImage' || prop === 'createPattern') {
				return (first, ...rest) => value.call(target, unwrap(first), ...rest);
			}
			return value.bind(target);
		},
		set(target, prop, value) {
			target[prop] = value;
			return true;
		},
	});

	contextCache.set(ctx, wrapper);
	return wrapper;
}

// --- resource paths -------------------------------------------------------
// The original refers to resources as "Resources/Skin/Default/Foo.png",
// relative to the widget bundle. The port keeps its copies under app/assets,
// so strip the leading Resources/ and point at that.

function resolveResource(src) {
	if (!src) return '';
	if (/^(https?:|file:|data:)/.test(src)) return src;
	return `../assets/${assetKey(src)}`;
}

// The asset-relative path, which is how the generated size table is keyed.
function assetKey(src) {
	return String(src).replace(/^Resources\//, '');
}

// Synchronous dimensions from the generated table; see tools/gen-image-sizes.js.
function lookupImageSize(src) {
	if (!src || /^(https?:|data:)/.test(src)) return null;
	const table = globalThis.KON_IMAGE_SIZES;
	return (table && table[assetKey(src)]) || null;
}

// The DOM's own Image constructor, kept before the shim shadows it. The
// preloader needs a real <img> to decode files; `new Image()` would now
// build a Konfabulator one.
globalThis.NativeImage = globalThis.Image;

// Konfabulator's drawing primitives are globals in the original source.
Object.assign(globalThis, { Frame, Image, Text, Canvas });
globalThis.KonObject = KonObject;
globalThis.resolveResource = resolveResource;
