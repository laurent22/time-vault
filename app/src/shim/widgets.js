// The remaining Konfabulator objects: Window, MenuItem, FormField, ScrollBar
// and URL.
//
// Window is the interesting one. In Konfabulator a Window was a real OS
// window the widget created and positioned on screen; here there is exactly
// one, created by the Electron main process, and the shim's job is to map
// hOffset/vOffset onto the OS window position while letting appendChild()
// work like any other container.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	// --- Window -------------------------------------------------------------

	class Window extends globalThis.KonObject {
		constructor() {
			// The window's content root. Everything the widget appends ends up
			// inside #stage, which fills the Electron window.
			const node = document.getElementById('stage') || document.body;
			super(node);

			// The stage is the window itself, so it must not be offset the way
			// a child element would be; hOffset/vOffset move the OS window.
			this.node.style.position = 'absolute';
			this.node.style.left = '0px';
			this.node.style.top = '0px';

			this._title = '';
			this._winX = 0;
			this._winY = 0;
			this._width = 0;
			this._height = 0;

			const pos = host.windowPosition ? host.windowPosition() : [0, 0];
			this._winX = pos[0];
			this._winY = pos[1];
		}

		// Window offsets are screen coordinates, not CSS offsets.
		get hOffset() { return this._winX; }
		set hOffset(v) {
			this._winX = Math.round(Number(v) || 0);
			if (host.setPosition) host.setPosition(this._winX, this._winY);
		}

		get vOffset() { return this._winY; }
		set vOffset(v) {
			this._winY = Math.round(Number(v) || 0);
			if (host.setPosition) host.setPosition(this._winX, this._winY);
		}

		get width() { return this._width; }
		set width(v) {
			this._width = Math.round(Number(v) || 0);
			if (host.setSize) host.setSize(this._width, this._height);
		}

		get height() { return this._height; }
		set height(v) {
			this._height = Math.round(Number(v) || 0);
			if (host.setSize) host.setSize(this._width, this._height);
		}

		get title() { return this._title; }
		set title(v) {
			this._title = v == null ? '' : String(v);
			document.title = this._title;
		}

		// Konfabulator windows had a contextMenuItems array.
		get contextMenuItems() { return this._contextMenuItems || []; }
		set contextMenuItems(v) { this._contextMenuItems = v; }
	}

	// --- MenuItem -----------------------------------------------------------
	// A plain data holder. The context menu is built from these by the main
	// process when a menu is actually shown; the widget attaches its own ad-hoc
	// properties to them (__event, __task, __project), which must survive.

	class MenuItem {
		constructor() {
			this.title = '';
			this.onSelect = null;
			this.enabled = true;
			this.checked = false;
			this.owner = null;
			this.object = null;
			this.frame = null;
		}
	}

	// --- FormField ----------------------------------------------------------
	// Used to build the preferences dialog. The port doesn't render a
	// Konfabulator preferences window, so these are data holders the
	// preferences UI can read later.

	class FormField {
		constructor() {
			this.type = 'text';
			this.title = '';
			this.description = '';
			this.defaultValue = '';
			this.option = null;
			this.optionValue = null;
		}
	}

	// --- ScrollBar ----------------------------------------------------------
	// The drawer's project and summary lists use these. Rendered as a simple
	// absolutely-positioned track and thumb so the original's manual layout
	// maths still applies.

	class ScrollBar extends globalThis.KonObject {
		constructor() {
			super(document.createElement('div'));
			this._width = 0;
			this._height = 0;
			this._thumbColor = '#888888';
			this._autoHide = false;
			this._value = 0;
			this._maximum = 100;

			this.thumb = document.createElement('div');
			this.thumb.style.position = 'absolute';
			this.thumb.style.left = '0px';
			this.thumb.style.top = '0px';
			this.thumb.style.width = '100%';
			this.thumb.style.borderRadius = '3px';
			this.thumb.style.background = this._thumbColor;
			this.node.appendChild(this.thumb);

			this.onScroll = null;
		}

		get width() { return this._width; }
		set width(v) {
			this._width = Number(v) || 0;
			this.node.style.width = `${this._width}px`;
		}

		get height() { return this._height; }
		set height(v) {
			this._height = Number(v) || 0;
			this.node.style.height = `${this._height}px`;
			this._layoutThumb();
		}

		get thumbColor() { return this._thumbColor; }
		set thumbColor(v) {
			this._thumbColor = v;
			this.thumb.style.background = v;
		}

		get autoHide() { return this._autoHide; }
		set autoHide(v) { this._autoHide = !!v; }

		get value() { return this._value; }
		set value(v) {
			this._value = Number(v) || 0;
			this._layoutThumb();
		}

		get maximum() { return this._maximum; }
		set maximum(v) {
			this._maximum = Number(v) || 0;
			this._layoutThumb();
		}

		_layoutThumb() {
			const span = Math.max(1, this._maximum);
			const frac = Math.min(1, Math.max(0, this._value / span));
			const thumbH = Math.max(20, this._height * 0.3);
			this.thumb.style.height = `${thumbH}px`;
			this.thumb.style.top = `${frac * Math.max(0, this._height - thumbH)}px`;
			if (this._autoHide) {
				this.thumb.style.visibility = this._maximum > 0 ? 'visible' : 'hidden';
			}
		}
	}

	// --- URL ----------------------------------------------------------------
	// One call site: the "check for a new version" request in Main.js.

	class KonURL {
		constructor(location) {
			this.location = location || '';
			this.response = '';
			this.onComplete = null;
		}

		// Konfabulator passed the completion handler as an argument.
		fetchAsync(callback) {
			const done = typeof callback === 'function' ? callback : this.onComplete;
			fetch(this.location)
				.then((r) => r.text())
				.then((text) => {
					this.response = text;
					if (typeof done === 'function') done(this);
				})
				.catch(() => {
					// A failed version check shouldn't surface to the user —
					// the original service is long gone.
					this.response = '';
				});
		}
	}

	Object.assign(globalThis, { Window, MenuItem, FormField, ScrollBar });
	// Shadowing the DOM's URL would break anything that relies on it, so the
	// Konfabulator one is only installed under its own name; Main.js's single
	// `new URL(...)` call site is patched to use it.
	globalThis.KonURL = KonURL;
})();
