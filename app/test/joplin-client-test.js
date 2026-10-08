// Tests for the Joplin client's port discovery.
//
// Plain Node, not Electron: the module is deliberately loadable without it, so
// these run without booting a renderer.
//
// The ordering is asserted through portCandidates rather than by standing up a
// stub server on the real ports — a running Joplin already owns those, so a
// test that binds them fails against the developer's own machine.

'use strict';

const assert = require('node:assert');

const {
	discoverPort, portCandidates, BASE_PORTS, PORT_ATTEMPTS,
} = require('../src/joplin-client');

const results = [];
async function check(name, fn) {
	try {
		await fn();
		results.push({ name, ok: true });
	} catch (e) {
		results.push({ name, ok: false, msg: e.message });
	}
}

(async () => {
	await check('a development build looks for a development Joplin first', () => {
		// Probing prod first regardless meant a dev TimeVault authorised
		// against the release app whenever both were running — and the
		// authorisation prompt then appeared in the window you weren't
		// watching, which looked like no prompt at all.
		const dev = portCandidates(true);
		assert.strictEqual(dev[0], BASE_PORTS.dev, 'a dev build should try the dev base first');

		const prod = portCandidates(false);
		assert.strictEqual(prod[0], BASE_PORTS.prod, 'a release build should try the prod base first');
	});

	await check('the ranges are matched, never crossed over', () => {
		// Falling back to the other range sounds helpful but means a dev
		// build syncs into the real notes, and authorises against an app you
		// aren't watching so the prompt seems not to appear. Not syncing is
		// the better failure.
		const dev = portCandidates(true);
		assert.ok(!dev.includes(BASE_PORTS.prod),
			'a dev build must not probe the release range');

		const prod = portCandidates(false);
		assert.ok(!prod.includes(BASE_PORTS.dev),
			'a release build must not probe the dev range');
	});

	await check('each build probes exactly its own range', () => {
		for (const preferDev of [true, false]) {
			const c = portCandidates(preferDev);
			assert.strictEqual(c.length, PORT_ATTEMPTS, 'one range, ten ports');
			assert.strictEqual(new Set(c).size, c.length, 'no port should be probed twice');
		}
	});

	await check('each range walks up from its base, as Joplin does', () => {
		// Joplin takes the next port when its own is occupied.
		const c = portCandidates(true);
		for (let i = 0; i < PORT_ATTEMPTS; i++) {
			assert.strictEqual(c[i], BASE_PORTS.dev + i);
		}
	});

	await check('discovery resolves rather than throwing when nothing answers', async () => {
		// An unused range: whatever is or isn't running locally, this must
		// return a value rather than reject.
		const port = await discoverPort(true);
		assert.ok(port === null || Number.isInteger(port), `unexpected result: ${port}`);
	});

	await check('a stored port from the wrong range is discarded', async () => {
		// A token saved while the ranges still crossed over would otherwise
		// pin a dev build to the release app forever — the stored port is
		// reused whenever it answers, so the matching would never take hold.
		const { JoplinClient } = require('../src/joplin-client');
		const client = new JoplinClient(BASE_PORTS.prod, 'a-token-for-the-release-app');

		// preferDev: the release port is now out of range.
		await client.connect(true);

		assert.notStrictEqual(client.port, BASE_PORTS.prod,
			'the release port should not have been kept');
		if (client.port !== null) {
			assert.ok(portCandidates(true).includes(client.port),
				`settled on ${client.port}, which is outside the dev range`);
		}
	});

	// --- waitForAuth, against a stub that mimics Joplin's answers ----------

	// A client pointed at a stub server, so these don't need Joplin running.
	async function withStub(handler, fn) {
		const http = require('node:http');
		const server = http.createServer((req, res) => {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(handler(req)));
		});
		await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
		const { JoplinClient } = require('../src/joplin-client');
		const client = new JoplinClient(server.address().port, null);
		try {
			return await fn(client);
		} finally {
			server.close();
		}
	}

	await check('a superseded auth token ends the wait quietly', async () => {
		// Joplin keeps only the newest auth token, so a second POST /auth
		// invalidates the first and /auth/check answers with an error. That
		// used to throw, which surfaced as a failure dialog about a second
		// after the attempt started — while the real prompt was still up.
		const result = await withStub(
			() => ({ error: 'Internal Server Error: Invalid auth token: abc' }),
			(client) => client.waitForAuth('abc', { timeoutMs: 3000, intervalMs: 50 }),
		);
		assert.strictEqual(result, null, 'an invalidated token should yield null');
	});

	await check('a rejected request yields null', async () => {
		const result = await withStub(
			() => ({ status: 'rejected' }),
			(client) => client.waitForAuth('abc', { timeoutMs: 3000, intervalMs: 50 }),
		);
		assert.strictEqual(result, null);
	});

	await check('an accepted request yields the token', async () => {
		const result = await withStub(
			() => ({ status: 'accepted', token: 'the-api-token' }),
			(client) => client.waitForAuth('abc', { timeoutMs: 3000, intervalMs: 50 }),
		);
		assert.strictEqual(result, 'the-api-token');
	});

	await check('nobody answering yields null rather than throwing', async () => {
		// The timeout has to be an ordinary outcome: the prompt is still
		// sitting in Joplin and the next sync asks again, so there is nothing
		// to report.
		const result = await withStub(
			() => ({ status: 'waiting' }),
			(client) => client.waitForAuth('abc', { timeoutMs: 300, intervalMs: 50 }),
		);
		assert.strictEqual(result, null);
	});

	// --- tokenIsValid: only a rejection means the token is bad -------------

	// A stub that controls the status code, which withStub above doesn't.
	async function withStatus(status, body, fn) {
		const http = require('node:http');
		const server = http.createServer((_req, res) => {
			res.writeHead(status, { 'Content-Type': 'application/json' });
			res.end(body);
		});
		await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
		const { JoplinClient } = require('../src/joplin-client');
		try {
			return await fn(new JoplinClient(server.address().port, 'a-token'));
		} finally {
			server.close();
		}
	}

	await check('a rejected token reports false', async () => {
		// Joplin answers 403 with `Invalid "token" parameter`.
		const v = await withStatus(403, '{"error":"Invalid token"}', (c) => c.tokenIsValid());
		assert.strictEqual(v, false);
	});

	await check('a working token reports true', async () => {
		const v = await withStatus(200, '{"items":[]}', (c) => c.tokenIsValid());
		assert.strictEqual(v, true);
	});

	await check('an unreachable Joplin reports unknown, not invalid', async () => {
		// This is the bug: a bare catch returned false for any failure, so a
		// busy or restarting Joplin looked exactly like a revoked token and
		// raised its authorisation prompt for a token that was fine.
		const { JoplinClient } = require('../src/joplin-client');
		const v = await new JoplinClient(59999, 'a-token').tokenIsValid();
		assert.strictEqual(v, null, 'a refused connection must not read as invalid');
	});

	await check('a server error reports unknown, not invalid', async () => {
		const v = await withStatus(500, 'boom', (c) => c.tokenIsValid());
		assert.strictEqual(v, null);
	});

	await check('no token at all is invalid, not unknown', async () => {
		const { JoplinClient } = require('../src/joplin-client');
		assert.strictEqual(await new JoplinClient(41184, null).tokenIsValid(), false);
	});

	let failed = 0;
	for (const r of results) {
		if (r.ok) {
			console.log(`  ok   ${r.name}`);
		} else {
			failed++;
			console.log(`  FAIL ${r.name}`);
			console.log(`         ${r.msg}`);
		}
	}
	console.log(`\n${results.length - failed}/${results.length} passed`);
	process.exit(failed === 0 ? 0 : 1);
})();
