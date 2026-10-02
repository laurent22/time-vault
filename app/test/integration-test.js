// Runs real ported widget code against the shim. ThreePiecesRectangle from
// Imaging.js is the sharpest test: it reads image widths synchronously in its
// constructor, which Konfabulator could answer immediately but the DOM cannot
// until the image has loaded.

'use strict';

const intResults = window.__shimTestResults || (window.__shimTestResults = []);

function intCheck(name, fn) {
	try {
		const msg = fn();
		const ok = msg === undefined || msg === true;
		intResults.push({ name, ok, msg: ok ? undefined : String(msg) });
	} catch (e) {
		intResults.push({ name, ok: false, msg: `threw: ${e.message}` });
	}
}

intCheck('ThreePiecesRectangle builds with correct slice geometry', () => {
	const r = new ThreePiecesRectangle('Resources/Skin/Default/BackgroundRight_');
	document.body.appendChild(r.frame.node);
	r.width = 300;

	// Real asset sizes: left cap 7px, middle 1px tile, right cap 41px, all 89 tall.
	const got = {
		middleLeft: r.imageMiddle.hOffset,
		middleWidth: r.imageMiddle.width,
		rightLeft: r.imageRight.hOffset,
		height: r.height,
	};
	r.frame.node.remove();

	if (got.middleLeft !== 7) return `middle should start after the 7px left cap, got ${got.middleLeft}`;
	if (got.middleWidth !== 300 - 7 - 41) return `middle should fill the gap (252), got ${got.middleWidth}`;
	if (got.rightLeft !== 300 - 41) return `right cap should sit at 259, got ${got.rightLeft}`;
	if (got.height !== 89) return `height should come from the slice art (89), got ${got.height}`;
});

intCheck('ThreePiecesRectangle forwards offsets and opacity to its frame', () => {
	const r = new ThreePiecesRectangle('Resources/Skin/Default/BackgroundRight_');
	r.hOffset = 40;
	r.vOffset = 5;
	r.opacity = 128;
	return (r.frame.node.style.left === '40px' ? undefined : `left ${r.frame.node.style.left}`)
		|| (r.frame.node.style.top === '5px' ? undefined : `top ${r.frame.node.style.top}`)
		|| (r.opacity === 128 ? undefined : `opacity readback ${r.opacity}`);
});

intCheck('Puppeteer easing equations load and compute', () => {
	if (typeof EasingEquations !== 'object') return 'EasingEquations missing';
	const mid = Puppeteer.applyMotionType('easeInOutSine', 0, 100, 0.5);
	if (Math.abs(mid - 50) > 0.001) return `easeInOutSine at t=0.5 should be 50, got ${mid}`;
	if (Puppeteer.applyMotionType('linearTween', 0, 100, 0) !== 0) return 't=0 should return start';
	if (Puppeteer.applyMotionType('linearTween', 0, 100, 1) !== 100) return 't=1 should return end';
});

intCheck('Puppeteer framePerSeconds accessor survived the rewrite', () => {
	if (Puppeteer.framePerSeconds !== 60) return `expected 60, got ${Puppeteer.framePerSeconds}`;
	Puppeteer.framePerSeconds = 30;
	const after = Puppeteer.framePerSeconds;
	Puppeteer.framePerSeconds = 60;
	if (after !== 30) return `after setting 30, got ${after}`;
});
