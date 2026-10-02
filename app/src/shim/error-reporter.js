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
	let bannerText = null;

	function showBanner(text) {
		if (!document.body) return;

		if (!banner) {
			banner = document.createElement('div');
			banner.style.cssText = `
				position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483647;
				background: rgba(170, 0, 0, 0.94); color: #fff; font: 11px/1.4 monospace;
				padding: 6px 8px; max-height: 40%; overflow: auto; pointer-events: auto;
			`;

			// The message is selectable even though the rest of the widget
			// isn't — an error you can't copy is hard to report.
			bannerText = document.createElement('div');
			bannerText.style.cssText =
				'white-space: pre-wrap; user-select: text; -webkit-user-select: text; cursor: text;';
			banner.appendChild(bannerText);

			const actions = document.createElement('div');
			actions.style.cssText = 'margin-top: 5px; display: flex; gap: 8px;';

			const button = (label, onClick) => {
				const b = document.createElement('button');
				b.textContent = label;
				b.style.cssText = `
					font: 10px/1 -apple-system, sans-serif; padding: 3px 9px; cursor: pointer;
					border: 1px solid rgba(255,255,255,0.5); border-radius: 3px;
					background: rgba(255,255,255,0.12); color: #fff;
				`;
				b.addEventListener('click', onClick);
				return b;
			};

			const copy = button('Copy', () => {
				navigator.clipboard.writeText(bannerText.textContent).then(() => {
					copy.textContent = 'Copied';
					setTimeout(() => { copy.textContent = 'Copy'; }, 1200);
				});
			});

			actions.appendChild(copy);
			actions.appendChild(button('Dismiss', () => {
				banner.remove();
				banner = null;
				bannerText = null;
			}));

			banner.appendChild(actions);
			document.body.appendChild(banner);
		}

		// Later errors append rather than replace, so a cascade isn't lost.
		bannerText.textContent = bannerText.textContent
			? `${bannerText.textContent}\n${text}`
			: text;
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
