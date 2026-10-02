// Surfaces renderer errors where they can actually be seen.
//
// The widget swallows failures in several places — Database.js catches and
// discards SQL errors, and the event bus loses exceptions thrown inside
// handlers — so a broken control looks identical to one that did nothing.
// With no devtools open and no terminal in view, that's invisible.
//
// This prints to the terminal running `npm start` and, for anything fatal,
// draws a banner over the widget.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	function report(kind, message, source) {
		const text = source ? `${message}  (${source})` : message;
		if (host.logError) host.logError(`${kind}: ${text}`);
		showBanner(`${kind}: ${message}`);
	}

	let banner = null;

	function showBanner(text) {
		if (!document.body) return;
		if (!banner) {
			banner = document.createElement('div');
			banner.style.cssText = `
				position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483647;
				background: rgba(170, 0, 0, 0.92); color: #fff; font: 11px/1.4 monospace;
				padding: 6px 8px; white-space: pre-wrap; max-height: 40%; overflow: auto;
				pointer-events: auto; cursor: pointer;
			`;
			// Click to dismiss, so it can't permanently cover the widget.
			banner.addEventListener('click', () => { banner.remove(); banner = null; });
			document.body.appendChild(banner);
		}
		banner.textContent = `${text}\n(click to dismiss)`;
	}

	globalThis.addEventListener('error', (e) => {
		report('Error', e.message, e.filename
			? `${String(e.filename).split('/').pop()}:${e.lineno}` : '');
	});

	globalThis.addEventListener('unhandledrejection', (e) => {
		const reason = e.reason && e.reason.message ? e.reason.message : String(e.reason);
		report('Unhandled rejection', reason, '');
	});

	// Mirror console.error to the terminal too: the widget logs plenty that
	// never reaches a visible surface.
	const originalError = console.error.bind(console);
	console.error = (...args) => {
		originalError(...args);
		if (host.logError) host.logError(args.map(String).join(' '));
	};

	globalThis.konReportError = report;
})();
