// Loads the ported widget code, in order, once the skin has been decoded.
//
// The scripts can't just sit in index.html: MainWindow.js composites the
// skin onto canvases while it constructs, and an <img> that hasn't decoded
// draws nothing (silently). Konfabulator's images were synchronous, so the
// port has to make them so — see shim/preload-images.js.
//
// Order mirrors the includeFile() calls at the top of Main.js, which is
// where the original declared its dependencies, with two changes the port
// needs: FrameWrapper.js must precede RoundButton.js and FlashingButton.js,
// and WidGUI loads where Main.js pulls it in.

'use strict';

const KON_WIDGET_SCRIPTS = [
	'widget/Localization.js',
	'widget/StringHelper.js',
	'widget/Log.js',
	'widget/ExtendedTimer.js',
	'widget/EventInterface.js',
	'widget/DateHelper.js',
	'widget/Database.js',
	'widget/Imaging.js',
	'widget/SystemHelper.js',

	'widget/Puppeteer.js',
	'widget/Puppeteer.Animation.js',
	'widget/Puppeteer.EaseEquations.js',

	// WidGUI, the UI toolkit Main.js loads at runtime.
	'widgui/Widgui_Manager.js',
	'widgui/Widgui_UserControl.js',
	'widgui/Widgui_Label.js',
	'widgui/Widgui_Button.js',
	'widgui/Widgui_GraphicButton.js',
	'widgui/Widgui_TextButton.js',
	'widgui/Widgui_DropdownList.js',

	'widget/EventDatabase.js',
	'widget/ProjectEvent.js',
	'widget/Project.js',
	'widget/ProjectPossibleTask.js',
	// FrameWrapper defines the base RoundButton and FlashingButton extend.
	'widget/FrameWrapper.js',
	'widget/ProjectItem.js',
	'widget/PossibleTaskItem.js',
	'widget/RoundButton.js',
	'widget/FlashingButton.js',
	'widget/MainWindow.js',
	'widget/MainDrawer.js',

	'widget/Main.js',
];

function loadScript(src) {
	return new Promise((resolve, reject) => {
		const el = document.createElement('script');
		el.src = src;
		// Classic scripts appended this way still execute in insertion order
		// only if we await each one, which is what the sequential loop below
		// does — the ported code depends on load order.
		el.onload = () => resolve();
		el.onerror = () => reject(new Error(`failed to load ${src}`));
		document.body.appendChild(el);
	});
}

globalThis.konBootWidget = async function konBootWidget() {
	try {
		const decoded = await globalThis.konPreloadImages();
		console.log(`[boot] decoded ${decoded} skin images`);

		for (const src of KON_WIDGET_SCRIPTS) {
			await loadScript(src);
		}

		globalThis.KON_WIDGET_READY = true;
		document.dispatchEvent(new CustomEvent('kon-widget-ready'));
	} catch (e) {
		// Without this a boot failure is an unhandled rejection: the window
		// stays blank, nothing reaches the console, and the probes hang
		// waiting for a ready event that never fires.
		console.error('[boot] failed:', e && e.message ? e.message : e);
		globalThis.KON_BOOT_ERROR = String(e && e.message ? e.message : e);
		document.dispatchEvent(new CustomEvent('kon-widget-ready'));
	}
};
