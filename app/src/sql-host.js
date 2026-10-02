// Main-process SQLite, backed by node:sqlite (built into Node 22+, so no
// native module to compile or ship).
//
// Synchronous, like the Konfabulator API it replaces. Database handles are
// kept here and referenced from the renderer by integer id, so the renderer
// never holds a native handle.

'use strict';

const { ipcMain } = require('electron');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const handles = new Map();
let nextHandle = 1;

// SQLITE_BUSY. Database.js checks for this code specifically when a close
// fails because statements are still open.
const SQLITE_BUSY = 5;

function fail(errCode, errMsg) {
	return { __error: true, errCode, errMsg };
}

// Rows arrive as null-prototype objects, and integers outside the safe range
// arrive as BigInt. Convert to something structured-cloneable that the ported
// code can treat like the plain objects Konfabulator handed it.
function normaliseRow(row) {
	const out = {};
	for (const key of Object.keys(row)) {
		const v = row[key];
		if (typeof v === 'bigint') {
			out[key] = Number.isSafeInteger(Number(v)) ? Number(v) : String(v);
		} else if (v instanceof Uint8Array) {
			out[key] = Buffer.from(v).toString('utf8');
		} else {
			out[key] = v;
		}
	}
	return out;
}

const ops = {
	open(filePath) {
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		const db = new DatabaseSync(filePath);
		const id = nextHandle++;
		handles.set(id, db);
		return id;
	},

	close(id) {
		const db = handles.get(id);
		if (!db) return true;
		db.close();
		handles.delete(id);
		return true;
	},

	exec(id, sql) {
		const db = handles.get(id);
		if (!db) throw Object.assign(new Error('database not open'), { errCode: SQLITE_BUSY });
		// node:sqlite's exec() handles multi-statement SQL but reports
		// nothing back; prepare/run gives us changes and lastInsertRowid,
		// which Database.js exposes. Fall back to exec() for scripts that
		// prepare() can't take in one go (e.g. BEGIN/COMMIT pairs).
		try {
			const stmt = db.prepare(sql);
			const r = stmt.run();
			return { changes: Number(r.changes || 0), lastInsertRowid: Number(r.lastInsertRowid || 0) };
		} catch {
			db.exec(sql);
			return { changes: 0, lastInsertRowid: 0 };
		}
	},

	query(id, sql) {
		const db = handles.get(id);
		if (!db) throw Object.assign(new Error('database not open'), { errCode: SQLITE_BUSY });
		// node:sqlite returns null-prototype objects and can return BigInt for
		// large integers; neither survives IPC structured cloning, so rows are
		// normalised to plain objects with JS numbers here.
		return db.prepare(sql).all().map(normaliseRow);
	},
};

function register() {
	ipcMain.on('host:sql', (event, method, ...args) => {
		const op = ops[method];
		if (!op) {
			event.returnValue = fail(1, `unknown sql method: ${method}`);
			return;
		}
		try {
			event.returnValue = op(...args);
		} catch (e) {
			event.returnValue = fail(e.errCode === undefined ? 1 : e.errCode, e.message);
		}
	});
}

function closeAll() {
	for (const db of handles.values()) {
		try { db.close(); } catch { /* shutting down */ }
	}
	handles.clear();
}

module.exports = { register, closeAll };
