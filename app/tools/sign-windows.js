// electron-builder signtool hook: sign Windows binaries with SSL.com's
// cloud eSigner, the same service and credentials Joplin uses.
//
// The certificate lives in SSL.com's HSM rather than on disk, so signing
// means downloading their CodeSignTool and handing it the credentials. It
// writes the signed file to an output directory, which is then moved back
// over the original.
//
// Skipped unless SIGN_APPLICATION=1 and the credentials are present, so
// local builds and pull requests produce unsigned binaries rather than
// failing.

'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SIGN_TOOL = 'CodeSignTool.bat';
const SIGN_TOOL_URL = 'https://www.ssl.com/download/codesigntool-for-windows/';

function tempDir() {
	// RUNNER_TEMP on CI; anywhere writable otherwise.
	const dir = process.env.RUNNER_TEMP || process.env.GITHUB_WORKSPACE
		|| path.join(__dirname, '..', 'temp');
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

async function downloadSignTool(root) {
	const extractDir = path.join(root, 'signToolExtract');
	if (fs.existsSync(path.join(extractDir, SIGN_TOOL))) {
		console.info('[sign] CodeSignTool already downloaded');
		return extractDir;
	}

	const downloadDir = path.join(root, 'signToolDownload');
	fs.mkdirSync(downloadDir, { recursive: true });
	fs.mkdirSync(extractDir, { recursive: true });

	const response = await fetch(SIGN_TOOL_URL);
	if (!response.ok) {
		throw new Error(`[sign] downloading CodeSignTool failed: HTTP ${response.status}`);
	}

	const zipPath = path.join(downloadDir, 'codeSignTool.zip');
	fs.writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));

	execSync(
		`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`,
		{ stdio: 'inherit' },
	);

	return extractDir;
}

exports.default = async function signWindows(configuration) {
	const inputFilePath = configuration.path;

	const {
		SSL_ESIGNER_USER_NAME,
		SSL_ESIGNER_USER_PASSWORD,
		SSL_ESIGNER_CREDENTIAL_ID,
		SSL_ESIGNER_USER_TOTP,
		SIGN_APPLICATION,
	} = process.env;

	if (SIGN_APPLICATION !== '1') {
		console.info('[sign] SIGN_APPLICATION is not 1 — leaving unsigned');
		return;
	}

	if (!SSL_ESIGNER_USER_NAME || !SSL_ESIGNER_USER_PASSWORD
		|| !SSL_ESIGNER_CREDENTIAL_ID || !SSL_ESIGNER_USER_TOTP) {
		throw new Error('[sign] SIGN_APPLICATION=1 but the SSL_ESIGNER_* credentials are missing');
	}

	console.info('[sign] signing', inputFilePath);

	const root = tempDir();
	const signToolDir = await downloadSignTool(root);
	const outDir = path.join(root, 'signToolOut');
	fs.mkdirSync(outDir, { recursive: true });

	const previousDir = process.cwd();
	process.chdir(signToolDir);

	try {
		execSync([
			`${SIGN_TOOL} sign`,
			`-input_file_path="${inputFilePath}"`,
			`-output_dir_path="${outDir}"`,
			`-credential_id="${SSL_ESIGNER_CREDENTIAL_ID}"`,
			`-username="${SSL_ESIGNER_USER_NAME}"`,
			`-password="${SSL_ESIGNER_USER_PASSWORD}"`,
			`-totp_secret="${SSL_ESIGNER_USER_TOTP}"`,
		].join(' '), { stdio: 'inherit' });

		const created = fs.readdirSync(outDir);
		if (!created.length) throw new Error('CodeSignTool produced no output');

		// The signed copy replaces the original in place. Copy rather than
		// rename: the temp dir and the workspace can be on different volumes
		// on CI, and rename fails across them.
		fs.copyFileSync(path.join(outDir, created[0]), inputFilePath);
		fs.rmSync(outDir, { recursive: true, force: true });
	} finally {
		process.chdir(previousDir);
	}

	console.info('[sign] signed', inputFilePath);
};
