// Konfabulator's `preferences` global, backed by a JSON file.
//
// The original read and wrote preferences.<name>.value directly, with
// Konfabulator persisting them behind the scenes. Each entry also carries the
// metadata declared in the .kon manifest (defaultValue, and option/optionValue
// lists for popups), all of which the widget code reads.
//
// Values are always strings in Konfabulator, including for checkboxes ("0" /
// "1") and colours ("#0d68ff"). Preserved exactly: the ported code does string
// comparisons against them in several places, and coercing to booleans or
// numbers here would break those silently.
//
// Writes are debounced and sent to the main process, which owns the file.

'use strict';

(function () {
	const schema = globalThis.KON_PREFS_SCHEMA || {};
	const stored = globalThis.KON_PREFS_STORED || {};

	// "setme" is the original's sentinel for "no saved value yet"; the widget
	// checks for it explicitly, so it's passed through rather than resolved.
	function initialValue(name) {
		if (Object.prototype.hasOwnProperty.call(stored, name)) return String(stored[name]);
		const def = schema[name] ? schema[name].defaultValue : '';
		return def === undefined || def === null ? '' : String(def);
	}

	let pending = null;

	function scheduleSave() {
		if (pending) return;
		pending = setTimeout(() => {
			pending = null;
			const flat = {};
			for (const name of Object.keys(preferences)) flat[name] = preferences[name].value;
			if (globalThis.tvHost && globalThis.tvHost.savePreferences) {
				globalThis.tvHost.savePreferences(flat);
			}
		}, 250);
	}

	class Preference {
		constructor(name, meta) {
			this.name = name;
			this._value = initialValue(name);

			this.defaultValue = meta.defaultValue !== undefined ? String(meta.defaultValue) : '';
			this.type = meta.type || 'text';
			this.hidden = !!meta.hidden;
			if (meta.group) this.group = meta.group;
			// Popup preferences expose parallel label/value lists.
			if (meta.option) this.option = meta.option.slice();
			if (meta.optionValue) this.optionValue = meta.optionValue.slice();
		}

		get value() { return this._value; }
		set value(v) {
			const next = v === undefined || v === null ? '' : String(v);
			if (next === this._value) return;
			this._value = next;
			scheduleSave();
		}
	}

	const preferences = {};
	for (const name of Object.keys(schema)) {
		preferences[name] = new Preference(name, schema[name]);
	}

	// The widget occasionally reads a preference the manifest doesn't declare;
	// Konfabulator returned an empty one rather than throwing.
	const handler = {
		get(target, prop) {
			if (prop in target) return target[prop];
			if (typeof prop === 'string' && !prop.startsWith('_')) {
				target[prop] = new Preference(prop, { defaultValue: '' });
				return target[prop];
			}
			return undefined;
		},
	};

	globalThis.preferences = new Proxy(preferences, handler);

	// <preferenceGroup> elements from the .kon; Main.js iterates these to
	// title the tabs of the preferences dialog.
	globalThis.preferenceGroups = globalThis.KON_PREF_GROUPS || {};

	// Flush immediately on unload, so a quit doesn't lose the last 250ms of
	// changes (window position in particular is written as the window moves).
	globalThis.addEventListener('beforeunload', () => {
		if (!pending) return;
		clearTimeout(pending);
		pending = null;
		const flat = {};
		for (const name of Object.keys(preferences)) flat[name] = preferences[name].value;
		if (globalThis.tvHost && globalThis.tvHost.savePreferencesSync) {
			globalThis.tvHost.savePreferencesSync(flat);
		}
	});
})();
