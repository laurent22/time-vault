// Tests the preferences lifecycle and the menu/tray command routing.

'use strict';

const puResults = window.__shimTestResults || (window.__shimTestResults = []);

function puCheck(name, fn) {
	try {
		const msg = fn();
		const ok = msg === undefined || msg === true;
		puResults.push({ name, ok, msg: ok ? undefined : String(msg) });
	} catch (e) {
		puResults.push({ name, ok: false, msg: `threw: ${e.message}` });
	}
}

puCheck('the preferences window groups settings as the .kon declares', () => {
	const groups = globalThis.preferenceGroups;
	if (!groups) return 'preferenceGroups is missing';
	for (const key of ['skin', 'time', 'report']) {
		if (!groups[key]) return `missing the "${key}" group`;
	}
});

puCheck('hidden preferences stay out of the preferences window', () => {
	// windowLocation and the lastX values are state, not settings.
	const schema = globalThis.KON_PREFS_SCHEMA;
	if (!schema.windowLocation.hidden) return 'windowLocation should be hidden';
	if (!schema.lastDrawerHeight.hidden) return 'lastDrawerHeight should be hidden';
	if (schema.colorScheme.hidden) return 'colorScheme should be visible';
});

puCheck('konShowPreferences exists and is callable', () => {
	if (typeof globalThis.konShowPreferences !== 'function') {
		return 'konShowPreferences is not defined';
	}
});

puCheck('the colour scheme drives the glass colours', () => {
	// This is the mapping the widget applies in updateGradientColorsFromScheme.
	const before = preferences.glassColor1.value;

	preferences.colorScheme.value = '1';
	if (typeof globalThis.updateGradientColorsFromScheme === 'function') {
		globalThis.updateGradientColorsFromScheme();
		if (preferences.glassColor1.value !== '#F02400') {
			return `scheme 1 should give #F02400, got ${preferences.glassColor1.value}`;
		}

		preferences.colorScheme.value = '4';
		globalThis.updateGradientColorsFromScheme();
		if (preferences.glassColor1.value !== '#01469A') {
			return `scheme 4 should give #01469A, got ${preferences.glassColor1.value}`;
		}
	} else {
		preferences.glassColor1.value = before;
		return 'updateGradientColorsFromScheme is not loaded';
	}
});

puCheck('onWillChangePreferences populates the popup option lists', () => {
	if (typeof widget.onWillChangePreferences !== 'function') {
		return 'the widget did not install onWillChangePreferences';
	}
	widget.onWillChangePreferences();
	const cs = preferences.colorScheme;
	if (!Array.isArray(cs.option) || cs.option.length === 0) {
		return 'colorScheme has no options after onWillChangePreferences';
	}
	if (!Array.isArray(cs.optionValue) || cs.optionValue.length !== cs.option.length) {
		return 'option and optionValue lengths disagree';
	}
});
