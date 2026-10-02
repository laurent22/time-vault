// Konfabulator's SQLite object, backed by node:sqlite in the main process.
//
// The original API is a forward-only cursor:
//
//     var rows = db.query("SELECT * FROM Projects");
//     while (true) {
//         var row = rows.current();     // column-named properties, or null
//         if (row == null) break;
//         ...
//         rows.next();
//     }
//     rows.dispose();
//
// node:sqlite returns all rows as an array, so the cursor is reproduced over
// that array here. The result sets involved are small (one user's projects and
// time events), so materialising them is not a concern, and it means the
// renderer never holds an open statement handle across an IPC boundary.
//
// Errors carry .errCode and .errMsg, which Database.js inspects: it checks for
// errCode 5 (SQLITE_BUSY) to detect undisposed statements before retrying a
// close.

'use strict';

(function () {
	const host = globalThis.tvHost || {};

	function sqlCall(method, ...args) {
		if (!host.sql) throw makeError(1, 'no host bridge for SQLite');
		const res = host.sql(method, ...args);
		if (res && res.__error) throw makeError(res.errCode, res.errMsg);
		return res;
	}

	function makeError(errCode, errMsg) {
		const e = new Error(errMsg || 'SQL error');
		e.errCode = errCode === undefined ? 1 : errCode;
		e.errMsg = errMsg || 'SQL error';
		return e;
	}

	// Forward-only cursor over an already-materialised result set.
	class SQLiteResult {
		constructor(rows) {
			this._rows = rows || [];
			this._index = 0;
			this._disposed = false;
		}

		current() {
			if (this._disposed) return null;
			if (this._index >= this._rows.length) return null;
			return this._rows[this._index];
		}

		next() {
			if (this._index < this._rows.length) this._index++;
			return this.current();
		}

		dispose() {
			this._disposed = true;
			this._rows = [];
		}

		// Konfabulator exposed a row count on results.
		get count() { return this._rows.length; }
	}

	class SQLite {
		constructor() {
			this._handle = null;
			this.lastInsertRowID = 0;
			this.numRowsAffected = 0;
		}

		open(filePath) {
			this._handle = sqlCall('open', filePath);
		}

		close() {
			if (this._handle === null) return;
			sqlCall('close', this._handle);
			this._handle = null;
		}

		// Statements that return no rows.
		exec(sql) {
			const r = sqlCall('exec', this._handle, sql);
			if (r) {
				this.lastInsertRowID = r.lastInsertRowid || 0;
				this.numRowsAffected = r.changes || 0;
			}
		}

		// Statements that return rows.
		query(sql) {
			const rows = sqlCall('query', this._handle, sql);
			return new SQLiteResult(rows);
		}
	}

	globalThis.SQLite = SQLite;
	globalThis.SQLiteResult = SQLiteResult;
})();
