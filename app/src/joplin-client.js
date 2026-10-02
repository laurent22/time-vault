// A minimal Joplin Data API client.
//
// Talks to the Web Clipper service that the Joplin desktop app exposes on
// localhost. Covers only what the sync needs: finding the service, getting a
// token, and creating or updating folders and notes.
//
// Protocol details are taken from the Joplin source and docs:
//   - port discovery: packages/lib/randomClipperPort.ts and the clipper's
//     bridge.js, which probes 10 ports from the base and expects /ping to
//     answer with the exact string "JoplinClipperServer"
//   - auth: https://joplinapp.org/help/dev/spec/clipper_auth

'use strict';

const BASE_PORTS = {
	// From randomClipperPort.ts. A dev build of Joplin uses a different base,
	// so both are probed and whichever answers first wins.
	prod: 41184,
	dev: 27583,
};

// The clipper tries ten consecutive ports; Joplin walks up from the base when
// one is taken.
const PORT_ATTEMPTS = 10;
const PING_TIMEOUT_MS = 400;

// Whether this is a development build, which decides which Joplin to look for
// first. `electron` is required lazily: this module is also loaded from plain
// Node by the tests and the port probe, where there is no Electron at all.
function defaultPreferDev() {
	try {
		return !require('electron').app.isPackaged;
	} catch {
		return false;
	}
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

// The ports to try, in order.
//
// A development TimeVault talks to a development Joplin and a release one to a
// release Joplin — matched, not merely preferred. Falling back to the other
// range sounds helpful but means a dev build silently syncs into the real
// notes, and that it authorises against an app you aren't watching, so the
// prompt looks like it never appeared. Not syncing is the better failure.
//
// Separate from the probing so the ordering can be tested without binding the
// real ports, which a running Joplin already owns.
function portCandidates(preferDev) {
	const base = preferDev ? BASE_PORTS.dev : BASE_PORTS.prod;

	// Joplin walks up from its base when the port is taken.
	const candidates = [];
	for (let offset = 0; offset < PORT_ATTEMPTS; offset++) candidates.push(base + offset);
	return candidates;
}

// Returns the port Joplin is listening on, or null.
//
// `preferDev` defaults to whether this build is unpackaged, i.e. `npm start`.
async function discoverPort(preferDev = defaultPreferDev()) {
	const candidates = portCandidates(preferDev);

	for (const port of candidates) {
		try {
			const response = await fetchWithTimeout(
				`http://127.0.0.1:${port}/ping`, {}, PING_TIMEOUT_MS);
			const text = await response.text();
			// The exact handshake the clipper checks for.
			if (text.trim() === 'JoplinClipperServer') return port;
		} catch {
			// Nothing listening, or something that isn't Joplin.
		}
	}

	return null;
}

class JoplinClient {
	constructor(port, token) {
		this.port = port || null;
		this.token = token || null;
	}

	get baseUrl() {
		return `http://127.0.0.1:${this.port}`;
	}

	// The stored port is kept if it's still answering: the token belongs to
	// that particular Joplin, so hopping to another instance would only mean
	// re-authorising. Discovery is for when it's gone.
	//
	// A stored port outside this build's range is dropped, though — otherwise
	// a token saved while the ranges still crossed over would pin a dev build
	// to the release app forever, and the matching would never take effect.
	async connect(preferDev = defaultPreferDev()) {
		const expected = portCandidates(preferDev);
		if (this.port && !expected.includes(this.port)) {
			this.port = null;
			this.token = null;
		}

		if (this.port && await this.isAlive()) return true;
		this.port = await discoverPort(preferDev);
		return this.port !== null;
	}

	async isAlive() {
		try {
			const r = await fetchWithTimeout(`${this.baseUrl}/ping`, {}, PING_TIMEOUT_MS);
			return (await r.text()).trim() === 'JoplinClipperServer';
		} catch {
			return false;
		}
	}

	// Step 1 of the auth flow: ask for an auth_token, which is only used to
	// poll for the user's decision.
	async requestAuth() {
		const r = await fetchWithTimeout(`${this.baseUrl}/auth`, { method: 'POST' });
		if (!r.ok) throw new Error(`auth request failed: HTTP ${r.status}`);
		const body = await r.json();
		if (!body.auth_token) throw new Error('auth request returned no auth_token');
		return body.auth_token;
	}

	// Step 3: poll until the user accepts or rejects in Joplin.
	//
	// Returns the API token, or null if the request was rejected, superseded
	// or never answered. Only a genuine transport failure throws: waiting for
	// someone to notice a prompt is an ordinary outcome, not an error.
	async waitForAuth(authToken, { intervalMs = 1000, timeoutMs = 120000, onWaiting } = {}) {
		const deadline = Date.now() + timeoutMs;

		while (Date.now() < deadline) {
			const r = await fetchWithTimeout(
				`${this.baseUrl}/auth/check?auth_token=${encodeURIComponent(authToken)}`);
			const body = await r.json();

			if (body.status === 'accepted') {
				this.token = body.token;
				return body.token;
			}
			if (body.status === 'rejected') return null;

			// Joplin keeps only the most recent auth token, so a second POST
			// /auth invalidates this one and /auth/check answers with an
			// error instead of a status. That means another attempt has taken
			// over; this one just stops rather than reporting a failure.
			if (body.error) return null;

			if (onWaiting) onWaiting();
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}

		// Nobody answered in time. The prompt is still sitting in Joplin and
		// the next sync will ask again, so this is a null rather than a throw.
		return null;
	}

	// Confirms a stored token still works — Joplin's tokens can be revoked.
	async tokenIsValid() {
		if (!this.token) return false;
		try {
			const r = await this.get('/folders', { limit: 1 });
			return Array.isArray(r.items);
		} catch {
			return false;
		}
	}

	url(path, query = {}) {
		const params = new URLSearchParams({ token: this.token || '', ...query });
		return `${this.baseUrl}${path}?${params}`;
	}

	async get(path, query = {}) {
		const r = await fetchWithTimeout(this.url(path, query));
		if (!r.ok) throw new Error(`GET ${path} failed: HTTP ${r.status}`);
		return r.json();
	}

	async post(path, body) {
		const r = await fetchWithTimeout(this.url(path), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		if (!r.ok) throw new Error(`POST ${path} failed: HTTP ${r.status} ${await r.text()}`);
		return r.json();
	}

	async put(path, body) {
		const r = await fetchWithTimeout(this.url(path), {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		if (!r.ok) throw new Error(`PUT ${path} failed: HTTP ${r.status} ${await r.text()}`);
		return r.json();
	}

	async delete(path) {
		const r = await fetchWithTimeout(this.url(path), { method: 'DELETE' });
		if (!r.ok) throw new Error(`DELETE ${path} failed: HTTP ${r.status}`);
	}

	// --- the bits the sync actually uses ------------------------------------

	// Pages through a list endpoint; Joplin returns 100 items at a time.
	async getAll(path, query = {}) {
		const items = [];
		let page = 1;
		for (;;) {
			const body = await this.get(path, { ...query, page, limit: 100 });
			items.push(...(body.items || []));
			if (!body.has_more) break;
			page++;
		}
		return items;
	}

	async findFolder(title, parentId = '') {
		const folders = await this.getAll('/folders', { fields: 'id,title,parent_id' });
		return folders.find((f) => f.title === title && (f.parent_id || '') === parentId) || null;
	}

	async ensureFolder(title, parentId = '') {
		const existing = await this.findFolder(title, parentId);
		if (existing) return existing;
		return this.post('/folders', { title, parent_id: parentId });
	}

	async findNote(title, parentId) {
		const notes = await this.getAll(`/folders/${parentId}/notes`, { fields: 'id,title' });
		return notes.find((n) => n.title === title) || null;
	}

	// Creates the note, or overwrites the body of the existing one. This is
	// what makes the sync one-way: whatever is in Joplin is replaced.
	async upsertNote(title, body, parentId) {
		const existing = await this.findNote(title, parentId);
		if (existing) {
			return this.put(`/notes/${existing.id}`, { title, body });
		}
		return this.post('/notes', { title, body, parent_id: parentId });
	}
}

module.exports = { JoplinClient, discoverPort, portCandidates, BASE_PORTS, PORT_ATTEMPTS };
