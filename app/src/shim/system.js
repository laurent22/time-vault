// Konfabulator's loose global functions and the Timer object.
//
// Timer is backed by requestAnimationFrame rather than setInterval: Puppeteer
// drives all the widget's animation off a single timer at a nominal 60fps, and
// rAF both matches the display refresh and stops work while the window is
// hidden. The original's fixed-interval timer drifted; this won't.

'use strict';

// --- print / alert --------------------------------------------------------

globalThis.print = function print(...args) {
	console.log(...args);
};

globalThis.alert = globalThis.alert || function alert(msg) {
	console.warn('[alert]', msg);
};

// --- Timer ----------------------------------------------------------------

class Timer {
	constructor() {
		this._interval = 1 / 60; // seconds, as in Konfabulator
		this._ticking = false;
		this._rafId = null;
		this._lastTick = 0;
		this.onTimerFired = null;
	}

	// Konfabulator expresses the interval in seconds.
	get interval() { return this._interval; }
	set interval(v) { this._interval = Number(v) || 0; }

	get ticking() { return this._ticking; }
	set ticking(v) {
		const want = !!v;
		if (want === this._ticking) return;
		this._ticking = want;
		if (want) this._start();
		else this._stop();
	}

	_start() {
		this._lastTick = performance.now();
		const frame = (now) => {
			if (!this._ticking) return;
			this._rafId = requestAnimationFrame(frame);
			// Honour intervals slower than the display refresh; a 60fps
			// interval just fires every frame.
			if ((now - this._lastTick) / 1000 < this._interval - 0.0005) return;
			this._lastTick = now;
			if (typeof this.onTimerFired === 'function') this.onTimerFired();
		};
		this._rafId = requestAnimationFrame(frame);
	}

	_stop() {
		if (this._rafId !== null) cancelAnimationFrame(this._rafId);
		this._rafId = null;
	}

	reset() {
		this._lastTick = performance.now();
	}
}

globalThis.Timer = Timer;
