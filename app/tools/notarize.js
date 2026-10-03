// electron-builder afterSign hook: notarize and staple the macOS app.
//
// Done here rather than through electron-builder's own `notarize` option so
// the app can also be stapled — attaching the ticket to the bundle, so
// Gatekeeper can verify it offline. Without stapling, a user who is offline
// on first launch still gets the malware warning.
//
// Skipped silently unless APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD are set,
// so local builds and pull requests don't try to reach Apple.

'use strict';

const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

const APP_BUNDLE_ID = 'net.cozic.timevault';

module.exports = async function notarizeMacApp(params) {
	if (params.electronPlatformName !== 'darwin') return;

	const {
		APPLE_ID: appleId,
		APPLE_APP_SPECIFIC_PASSWORD: appleIdPassword,
		APPLE_TEAM_ID: teamId,
	} = process.env;

	if (!appleId || !appleIdPassword || !teamId) {
		console.info('[notarize] APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD or '
			+ 'APPLE_TEAM_ID not set — skipping notarization.');
		return;
	}

	const appPath = join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
	if (!existsSync(appPath)) throw new Error(`cannot find the app at ${appPath}`);

	console.log(`[notarize] notarizing ${appPath}`);

	// Apple can take well over ten minutes, and a CI job with no output for
	// that long is killed as hung.
	const tick = setInterval(() => console.log('[notarize] still waiting…'), 60000);

	try {
		// Required lazily: it's only installed on the macOS runner, and
		// requiring it at module load would break the Linux and Windows jobs,
		// which load this file through the config regardless of platform.
		const { notarize } = require('@electron/notarize');
		await notarize({ appBundleId: APP_BUNDLE_ID, appPath, appleId, appleIdPassword, teamId });
	} finally {
		clearInterval(tick);
	}

	// @electron/notarize doesn't staple, and without it an offline first
	// launch still shows the warning.
	console.log('[notarize] stapling the ticket to the app');
	execFileSync('xcrun', ['stapler', 'staple', appPath], { stdio: 'inherit' });

	console.log('[notarize] done');
};
