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

	await check('the whole preferred range comes before the other one', () => {
		// Otherwise an instance on a walked-up port of the wrong range would
		// win over the right one on its base port.
		const c = portCandidates(true);
		const firstProd = c.indexOf(BASE_PORTS.prod);
		const lastDev = c.lastIndexOf(BASE_PORTS.dev + PORT_ATTEMPTS - 1);
		assert.ok(lastDev < firstProd, 'the dev range must be exhausted before prod is touched');
	});

	await check('both ranges are tried, so a single instance is always found', () => {
		// The preference must not become a restriction.
		for (const preferDev of [true, false]) {
			const c = portCandidates(preferDev);
			assert.strictEqual(c.length, PORT_ATTEMPTS * 2, 'both ranges should be probed');
			assert.ok(c.includes(BASE_PORTS.dev), 'the dev base should be in the list');
			assert.ok(c.includes(BASE_PORTS.prod), 'the prod base should be in the list');
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
