#!/usr/bin/env node
//
// Bumps the version, commits it, tags it and pushes — which is what starts
// a release build. CI then builds all three platforms into a draft release
// and writes the changelog; publishing stays a manual click.
//
//   npm run release           # 0.1.0 -> 0.1.1
//   npm run release -- minor  # 0.1.0 -> 0.2.0
//   npm run release -- major  # 0.1.0 -> 1.0.0
//   npm run release -- 1.5.6  # exactly that
//
// Refuses to run on a dirty tree or a tag that already exists, because both
// produce a release that doesn't match what was built.

'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PACKAGE = path.join(__dirname, '..', 'package.json');

function git(...args) {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function fail(message) {
	console.error(`release: ${message}`);
	process.exit(1);
}

function nextVersion(current, part) {
	// An explicit version wins over a bump keyword.
	if (/^\d+\.\d+\.\d+$/.test(part)) return part;

	const [major, minor, patch] = current.split('.').map(Number);
	if ([major, minor, patch].some(Number.isNaN)) {
		fail(`cannot parse the current version: ${current}`);
	}

	switch (part) {
	case 'major': return `${major + 1}.0.0`;
	case 'minor': return `${major}.${minor + 1}.0`;
	case 'patch': return `${major}.${minor}.${patch + 1}`;
	default: return fail(`unknown version part "${part}" — use major, minor, patch, or an explicit x.y.z`);
	}
}

const part = process.argv[2] || 'patch';

// A dirty tree would mean the tag points at a commit that doesn't contain
// the changes being released.
if (git('status', '--porcelain')) {
	fail('the working tree has uncommitted changes — commit or stash them first');
}

const pkg = JSON.parse(fs.readFileSync(PACKAGE, 'utf8'));
const version = nextVersion(pkg.version, part);
const tag = `v${version}`;

// Tags are hard to move once pushed, and CI keys everything off them.
const existing = git('tag', '--list', tag);
if (existing) fail(`${tag} already exists`);

console.log(`${pkg.version} -> ${version}`);

// Rewrite only the version line, so the rest of the file — key order,
// formatting — is left exactly as it was.
const source = fs.readFileSync(PACKAGE, 'utf8');
const updated = source.replace(
	/^(\s*"version"\s*:\s*")[^"]+(")/m,
	`$1${version}$2`,
);
if (updated === source) fail('could not find the version line in package.json');
fs.writeFileSync(PACKAGE, updated);

// The lockfile carries the version too; npm rewrites it in place.
try {
	execFileSync('npm', ['install', '--package-lock-only'], {
		cwd: path.dirname(PACKAGE),
		stdio: 'ignore',
	});
} catch {
	console.warn('release: could not update package-lock.json; continuing');
}

git('add', PACKAGE, path.join(path.dirname(PACKAGE), 'package-lock.json'));
git('commit', '-m', `TimeVault ${version}`);
git('tag', tag);

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
git('push', 'origin', branch);
git('push', 'origin', tag);

const url = git('remote', 'get-url', 'origin')
	.replace(/\.git$/, '')
	.replace(/^git@github\.com:/, 'https://github.com/');

console.log(`\npushed ${tag}`);
console.log(`watch the build:  ${url}/actions`);
console.log(`draft release:    ${url}/releases`);
