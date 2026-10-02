// Tests for the preferences and filesystem/system/widget shims.

'use strict';

const prefResults = window.__shimTestResults || (window.__shimTestResults = []);

function prefCheck(name, fn) {
	try {
		const msg = fn();
		const ok = msg === undefined || msg === true;
		prefResults.push({ name, ok, msg: ok ? undefined : String(msg) });
	} catch (e) {
		prefResults.push({ name, ok: false, msg: `threw: ${e.message}` });
	}
}

prefCheck('all 32 preferences from the .kon are present', () => {
	const n = Object.keys(KON_PREFS_SCHEMA).length;
	if (n !== 32) return `expected 32 declared preferences, got ${n}`;
});

prefCheck('defaults come from the .kon manifest', () => {
	if (preferences.glassColor1.value !== '#0d68ff') return `glassColor1 = ${preferences.glassColor1.value}`;
	if (preferences.lastDrawerHeight.value !== '300') return `lastDrawerHeight = ${preferences.lastDrawerHeight.value}`;
	if (preferences.enableAutoSave.value !== '1') return `enableAutoSave = ${preferences.enableAutoSave.value}`;
	if (preferences.reportDataDelimiter.value !== ',') return `delimiter = ${preferences.reportDataDelimiter.value}`;
});

prefCheck('values are strings, including checkboxes and numbers', () => {
	// The ported code string-compares these; coercing would break it silently.
	if (typeof preferences.enableAutoSave.value !== 'string') return 'checkbox should be a string';
	if (typeof preferences.lastDrawerHeight.value !== 'string') return 'number should be a string';
});

prefCheck('the "setme" sentinel is preserved, not resolved', () => {
	// The widget checks for this explicitly to detect "never saved".
	if (preferences.windowLocation.value !== 'setme') return `got ${preferences.windowLocation.value}`;
});

prefCheck('defaultValue is readable alongside value', () => {
	preferences.lastRightPartWidth.value = '240';
	const r = preferences.lastRightPartWidth;
	const bad = (r.value !== '240' && `value = ${r.value}`)
		|| (r.defaultValue !== 'setme' && `defaultValue = ${r.defaultValue}`);
	preferences.lastRightPartWidth.value = 'setme';
	return bad || undefined;
});

prefCheck('popup preferences expose option and optionValue lists', () => {
	const p = preferences.numberDateFormat;
	if (!Array.isArray(p.option)) return 'option should be an array';
	if (p.option.length !== 2) return `expected 2 options, got ${p.option.length}`;
	if (p.optionValue[0] !== '0' || p.optionValue[1] !== '1') return `optionValues = ${p.optionValue}`;
	if (preferences.locale.option.length !== 4) return `locale should have 4 options, got ${preferences.locale.option.length}`;
});

prefCheck('assignment coerces to string and round-trips', () => {
	preferences.lastDrawerWidth.value = 250;
	const v = preferences.lastDrawerWidth.value;
	preferences.lastDrawerWidth.value = 'setme';
	if (v !== '250') return `expected "250" as a string, got ${JSON.stringify(v)}`;
});

prefCheck('reading an undeclared preference yields an empty one, not a throw', () => {
	const p = preferences.somethingNeverDeclared;
	if (!p) return 'should return an object';
	if (p.value !== '') return `value should be empty, got ${JSON.stringify(p.value)}`;
});

// --- filesystem / system / widget ----------------------------------------

prefCheck('filesystem reports a missing file as absent', () => {
	if (filesystem.itemExists('/definitely/not/here/xyz.txt') !== false) {
		return 'itemExists should be false for a missing path';
	}
});

prefCheck('filesystem round-trips a file through the host', () => {
	const dir = system.widgetDataFolder;
	if (!dir) return 'widgetDataFolder should be set';
	const f = `${dir}/shim-test-scratch.txt`;
	filesystem.writeFile(f, 'hello');
	const exists = filesystem.itemExists(f);
	const content = filesystem.readFile(f);
	filesystem.remove(f);
	const goneAfter = filesystem.itemExists(f);

	if (!exists) return 'file should exist after writeFile';
	if (content !== 'hello') return `readFile returned ${JSON.stringify(content)}`;
	if (goneAfter) return 'file should be gone after remove';
});

prefCheck('filesystem distinguishes directories from files', () => {
	const dir = system.widgetDataFolder;
	if (filesystem.isDirectory(dir) !== true) return 'data folder should be a directory';
	if (!Array.isArray(filesystem.getDirectoryContents(dir))) return 'contents should be an array';
});

prefCheck('system.platform uses Konfabulator vocabulary', () => {
	const p = system.platform;
	if (p !== 'macintosh' && p !== 'windows') return `unexpected platform: ${p}`;
});

prefCheck('screen reports a plausible work area', () => {
	if (!(screen.width > 0) || !(screen.height > 0)) return `${screen.width}x${screen.height}`;
});

prefCheck('widget exposes name and version', () => {
	if (!widget.name) return 'widget.name should be set';
	if (!/^\d+\.\d+/.test(widget.version)) return `version looks wrong: ${widget.version}`;
});

prefCheck('includeFile is a harmless no-op', () => {
	// Main.js calls this 25 times; load order comes from the script tags.
	includeFile('Resources/WidGUI/Scripts/Widgui_Manager.js');
});
