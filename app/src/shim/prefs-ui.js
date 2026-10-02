// The preferences window.
//
// Konfabulator rendered one automatically from the <preference> declarations
// in the .kon, grouped into the tabs given by <preferenceGroup>, and called
// widget.onWillChangePreferences before showing it and
// widget.onPreferencesChanged after. Main.js relies on both: the first
// populates the dropdown option lists and snapshots the current values, the
// second recomputes the glass colours from the colour scheme, copies the
// database if the data folder moved, and reloads on a locale change.
//
// So this reproduces the lifecycle rather than just editing values: without
// the two callbacks, changing the colour scheme would do nothing visible.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	// Konfabulator showed hidden preferences nowhere; they're state, not
	// settings (last window position, last selected project, and so on).
	function visiblePreferences() {
		const schema = globalThis.KON_PREFS_SCHEMA || {};
		return Object.keys(schema).filter((name) => !schema[name].hidden);
	}

	// Grouped the way the .kon declares, with ungrouped settings first —
	// which is where Konfabulator put them, under a "General" tab.
	function groupedPreferences() {
		const schema = globalThis.KON_PREFS_SCHEMA || {};
		const groups = globalThis.preferenceGroups || {};
		const out = [{ key: '', title: loc('preferenceGroup_general') || 'General', names: [] }];

		for (const key of Object.keys(groups)) {
			const g = groups[key];
			out.push({ key, title: g.title || key, names: [] });
		}

		for (const name of visiblePreferences()) {
			const key = schema[name].group || '';
			const target = out.find((g) => g.key === key) || out[0];
			target.names.push(name);
		}

		return out.filter((g) => g.names.length > 0);
	}

	// loc() isn't defined until the widget scripts load; fall back cleanly.
	function loc(id) {
		if (typeof globalThis.loc !== 'function') return null;
		const s = globalThis.loc(id);
		// Localization.js echoes the key back when there's no translation.
		return s === id ? null : s;
	}

	function labelFor(name) {
		return loc(`preference_${name}`) || name;
	}

	function descriptionFor(name) {
		const p = globalThis.preferences[name];
		return (p && p.description) || loc(`preferenceDescription_${name}`) || '';
	}

	globalThis.konShowPreferences = function konShowPreferences() {
		if (!host.preferences) {
			console.warn('[prefs] no host bridge');
			return;
		}

		// Let the widget populate option lists and snapshot current values.
		if (typeof globalThis.widget.onWillChangePreferences === 'function') {
			globalThis.widget.onWillChangePreferences();
		}

		const groups = groupedPreferences().map((g) => ({
			title: g.title,
			fields: g.names.map((name) => {
				const p = globalThis.preferences[name];
				return {
					name,
					type: p.type || 'text',
					label: labelFor(name),
					description: descriptionFor(name),
					value: p.value,
					option: p.option || null,
					optionValue: p.optionValue || null,
				};
			}),
		}));

		const result = host.preferences(groups, loc('preferences_title') || 'TimeVault Preferences');
		if (!result) return; // cancelled

		for (const name of Object.keys(result)) {
			if (globalThis.preferences[name]) globalThis.preferences[name].value = result[name];
		}

		// Let the widget react: recompute glass colours, move the database,
		// reload on a locale change.
		if (typeof globalThis.widget.onPreferencesChanged === 'function') {
			globalThis.widget.onPreferencesChanged();
		}
	};
})();
