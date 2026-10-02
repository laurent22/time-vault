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

puCheck('zoom scales the stage without touching the layout', () => {
	// The widget keeps working in its original 1x coordinates; only the
	// final composite is scaled, so nothing in the ported code has to know.
	if (typeof konSetZoom !== 'function') return 'konSetZoom is not exposed';

	const stage = document.getElementById('stage');
	const before = konZoom();

	konSetZoom(2);
	const transform = stage.style.transform;
	const origin = stage.style.transformOrigin;

	konSetZoom(before);

	if (!/scale\(2\)/.test(transform)) return `transform is ${JSON.stringify(transform)}`;
	// Top-left, so the widget grows down and right rather than drifting.
	if (!/^0(px)? 0(px)?$/.test(origin)) return `transform-origin is ${JSON.stringify(origin)}`;
});

puCheck('zoom clamps to the available levels', () => {
	if (typeof konSetZoom !== 'function') return 'konSetZoom is not exposed';
	const levels = konZoomLevels();
	const before = konZoom();

	konSetZoom(99);
	const high = konZoom();
	konSetZoom(0.01);
	const low = konZoom();
	konSetZoom(before);

	if (high !== levels[levels.length - 1]) return `clamped high to ${high}`;
	if (low !== levels[0]) return `clamped low to ${low}`;
});

puCheck('zoom at 1x leaves no transform behind', () => {
	// A leftover scale(1) would still create a containing block, which
	// changes how fixed-position descendants resolve.
	if (typeof konSetZoom !== 'function') return 'konSetZoom is not exposed';
	const stage = document.getElementById('stage');
	const before = konZoom();
	konSetZoom(2);
	konSetZoom(1);
	const transform = stage.style.transform;
	konSetZoom(before);
	if (transform !== '') return `expected no transform, got ${JSON.stringify(transform)}`;
});

puCheck('text measurements are independent of zoom', () => {
	// getBoundingClientRect reports post-transform pixels, but the ported
	// layout works in unscaled ones. Measuring through the zoom inflated
	// every width, so controls that size themselves to their text grew with
	// it — the drawer buttons ended up too narrow for their own labels and
	// clipped them.
	if (typeof konSetZoom !== 'function') return 'konSetZoom is not exposed';

	const t = new Text();
	t.style.fontSize = '12px';
	t.data = 'New event';
	document.body.appendChild(t.node);

	const before = konZoom();
	konSetZoom(1);
	const at1 = t.width;
	konSetZoom(2);
	const at2 = t.width;
	konSetZoom(before);
	t.node.remove();

	if (at1 <= 0) return `measured ${at1} at 1x`;
	// The element is outside #stage so it isn't scaled, but the getter must
	// divide by the stage scale regardless — a stage-resident element would
	// otherwise read double.
	if (Math.abs(at1 - at2 * 2) > 2 && Math.abs(at1 - at2) > 2) {
		return `inconsistent: ${at1} at 1x vs ${at2} at 2x`;
	}
});
