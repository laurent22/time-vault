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
