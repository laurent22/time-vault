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

// --- shared base ----------------------------------------------------------

class KonObject {
	constructor(node) {
		this.node = node;
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

	// Konfabulator opacity is 0-255. CSS wants 0-1.
	get opacity() { return this._opacity; }
	set opacity(v) {
		this._opacity = Number(v) || 0;
		this.node.style.opacity = String(this._opacity / 255);
	}

	get visible() { return this._visible; }
	set visible(v) {
		this._visible = !!v;
		this.node.style.visibility = this._visible ? 'visible' : 'hidden';
	}

	get zOrder() { return this._zOrder; }
	set zOrder(v) {
		this._zOrder = Number(v) || 0;
		this.node.style.zIndex = String(this._zOrder);
	}

	get tracking() { return this._tracking; }
	set tracking(v) {
		this._tracking = !!v;
		this.node.style.pointerEvents = this._tracking ? 'auto' : 'none';
	}

	get tooltip() { return this._tooltip; }
	set tooltip(v) {
		this._tooltip = v == null ? '' : String(v);
		this.node.title = this._tooltip;
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
		if (!parent || !sibling || sibling._parent !== parent) return;

		const list = parent.subviews;
		const from = list.indexOf(this);
		if (from !== -1) list.splice(from, 1);
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

	_installMouseEvents() {
		const fire = (name, e) => {
			const fn = this[name];
			if (typeof fn === 'function') fn.call(this, e);
		};

		this.node.addEventListener('mousedown', (e) => fire('onMouseDown', e));
		this.node.addEventListener('mouseup', (e) => fire('onMouseUp', e));
		this.node.addEventListener('mousemove', (e) => fire('onMouseMove', e));
		// Konfabulator's enter/exit don't bubble from children, which is what
		// mouseenter/mouseleave give us (unlike mouseover/mouseout).
		this.node.addEventListener('mouseenter', (e) => fire('onMouseEnter', e));
		this.node.addEventListener('mouseleave', (e) => fire('onMouseExit', e));
		this.node.addEventListener('wheel', (e) => fire('onMouseWheel', e));
		this.node.addEventListener('contextmenu', (e) => fire('onContextMenu', e));

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

	get width() { return this._width; }
	set width(v) {
		this._width = v == null ? null : Number(v);
		this.node.style.width = this._width == null ? '' : `${this._width}px`;
	}

	get height() { return this._height; }
	set height(v) {
		this._height = v == null ? null : Number(v);
		this.node.style.height = this._height == null ? '' : `${this._height}px`;
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

	get src() { return this._src; }
	set src(v) {
		this._src = v == null ? '' : String(v);
		this.node.src = resolveResource(this._src);
		this._natural = lookupImageSize(this._src);
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
		this.node.style.width = this._width == null ? '' : `${this._width}px`;
	}

	get height() {
		if (this._height != null) return this._height;
		if (this._natural) return this._natural[1];
		return this.node.naturalHeight || 0;
	}
	set height(v) {
		this._height = v == null ? null : Number(v);
		this.node.style.height = this._height == null ? '' : `${this._height}px`;
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
		this.node.style.lineHeight = 'normal';

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
		this.node.style.transform = v === 'topLeft' ? '' : 'translateY(-100%)';
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
		return Math.ceil(this.node.getBoundingClientRect().width);
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

	get height() { return Math.ceil(this.node.getBoundingClientRect().height); }
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

// --- canvas context -------------------------------------------------------
// Konfabulator's drawImage took its own Image objects. The DOM needs the
// underlying <img>/<canvas> element, so the wrapper unwraps shim objects on
// the way through. Everything else is forwarded untouched.
//
// The context is wrapped once per canvas and cached, so repeated getContext()
// calls — Imaging.js calls it per redraw — don't allocate a new wrapper each
// time.

const contextCache = new WeakMap();

function unwrap(v) {
	return v && v.node ? v.node : v;
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

// Konfabulator's drawing primitives are globals in the original source.
Object.assign(globalThis, { Frame, Image, Text, Canvas });
globalThis.KonObject = KonObject;
globalThis.resolveResource = resolveResource;
