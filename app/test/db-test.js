// Tests the SQLite shim, including the real Database.js running against it.
//
// The fixture is the actual _DevDataFolder/Events.db3 written by the original
// widget in November 2007: 17 events in one project, with the schema of the
// day (no Notes/Archived columns). That makes it a useful check that the
// port reads genuinely old data, not just data it wrote itself.

'use strict';

const dbResults = window.__shimTestResults || (window.__shimTestResults = []);

function dbCheck(name, fn) {
	try {
		const msg = fn();
		const ok = msg === undefined || msg === true;
		dbResults.push({ name, ok, msg: ok ? undefined : String(msg) });
	} catch (e) {
		dbResults.push({ name, ok: false, msg: `threw: ${e.message}` });
	}
}

function scratchPath(name) {
	return `${system.widgetDataFolder}/${name}`;
}

// Supplied by the runner as a query parameter; a copy of the original
// _DevDataFolder/Events.db3 so the committed fixture stays pristine.
const fixtureDbPath = new URLSearchParams(location.search).get('fixtureDb');

dbCheck('SQLite opens, execs and queries', () => {
	const f = scratchPath('shim-db-test.db3');
	filesystem.remove(f);

	const db = new SQLite();
	db.open(f);
	db.exec('CREATE TABLE t (ID INTEGER PRIMARY KEY, Name TEXT)');
	db.exec("INSERT INTO t (Name) VALUES ('alpha')");
	db.exec("INSERT INTO t (Name) VALUES ('beta')");

	const rows = db.query('SELECT * FROM t ORDER BY ID');
	const first = rows.current();
	rows.next();
	const second = rows.current();
	rows.next();
	const past = rows.current();
	rows.dispose();
	db.close();
	filesystem.remove(f);

	if (!first || first.Name !== 'alpha') return `first row: ${JSON.stringify(first)}`;
	if (!second || second.Name !== 'beta') return `second row: ${JSON.stringify(second)}`;
	if (past !== null) return 'cursor should return null past the last row';
});

dbCheck('lastInsertRowID is reported after an insert', () => {
	const f = scratchPath('shim-db-rowid.db3');
	filesystem.remove(f);

	const db = new SQLite();
	db.open(f);
	db.exec('CREATE TABLE t (ID INTEGER PRIMARY KEY, Name TEXT)');
	db.exec("INSERT INTO t (Name) VALUES ('one')");
	const first = db.lastInsertRowID;
	db.exec("INSERT INTO t (Name) VALUES ('two')");
	const second = db.lastInsertRowID;
	db.close();
	filesystem.remove(f);

	if (first !== 1) return `first insert rowid should be 1, got ${first}`;
	if (second !== 2) return `second insert rowid should be 2, got ${second}`;
});

dbCheck('double-quoted string literals still work, as in 2008 SQLite', () => {
	// EventDatabase.js creates its schema with
	//   INSERT INTO Projects (Name) VALUES ("____default____")
	// Modern SQLite reads a double-quoted token as an identifier and rejects
	// it. Without the compatibility flag the schema creation dies partway and
	// the Events table is never created — silently, because Database.js
	// swallows SQL errors.
	const f = scratchPath('shim-db-dqs.db3');
	filesystem.remove(f);

	const db = new SQLite();
	db.open(f);
	db.exec('CREATE TABLE Projects (ID INTEGER PRIMARY KEY, Name TEXT)');
	db.exec('INSERT INTO Projects (Name) VALUES ("____default____")');
	const rows = db.query('SELECT * FROM Projects');
	const row = rows.current();
	rows.dispose();
	db.close();
	filesystem.remove(f);

	if (!row) return 'the double-quoted insert produced no row';
	if (row.Name !== '____default____') return `got ${JSON.stringify(row.Name)}`;
});

dbCheck('a genuinely bad statement is not silently swallowed', () => {
	// The exec() fallback used to catch every error and retry with exec(),
	// which hid real failures.
	const f = scratchPath('shim-db-strict.db3');
	filesystem.remove(f);

	const db = new SQLite();
	db.open(f);
	let threw = false;
	try {
		db.exec('INSERT INTO NoSuchTable (x) VALUES (1)');
	} catch {
		threw = true;
	}
	db.close();
	filesystem.remove(f);

	if (!threw) return 'a write to a missing table should throw';
});

dbCheck('a bad statement raises an error carrying errMsg', () => {
	const f = scratchPath('shim-db-err.db3');
	filesystem.remove(f);

	const db = new SQLite();
	db.open(f);
	let caught = null;
	try {
		db.query('SELECT * FROM table_that_does_not_exist');
	} catch (e) {
		caught = e;
	}
	db.close();
	filesystem.remove(f);

	if (!caught) return 'expected a throw';
	// Database.js reads e.errMsg in its catch blocks.
	if (!caught.errMsg) return 'error should carry errMsg';
});

// --- the real Database.js against the real 2007 fixture -------------------

dbCheck('Database.js opens the original 2007 Events.db3', () => {
	const db = new Database(fixtureDbPath);
	db.open();
	if (!db.isOpen()) return 'database should report open';
	db.close();
});

dbCheck('Database.js reads the original projects and events', () => {
	const db = new Database(fixtureDbPath);
	db.open();

	const projects = db.query('SELECT * FROM Projects');
	const firstProject = projects.current();
	projects.dispose();

	const events = db.query('SELECT * FROM Events');
	let count = 0;
	let firstEvent = null;
	while (true) {
		const row = events.current();
		if (row == null) break;
		if (count === 0) firstEvent = row;
		count++;
		events.next();
	}
	events.dispose();
	db.close();

	if (!firstProject) return 'expected a project row';
	if (firstProject.Name !== '____default____') return `project name: ${firstProject.Name}`;
	if (count !== 17) return `expected the fixture's 17 events, got ${count}`;
	// Dates were stored as millisecond-epoch strings.
	if (firstEvent.StartDate !== '1194215036234') return `StartDate: ${firstEvent.StartDate}`;
	const d = new Date(Number(firstEvent.StartDate));
	if (d.getUTCFullYear() !== 2007) return `date should be in 2007, got ${d.toISOString()}`;
});

dbCheck('Database.js transactions commit', () => {
	const f = scratchPath('shim-db-tx.db3');
	filesystem.remove(f);

	const db = new Database(f);
	db.open();
	db.exec('CREATE TABLE t (ID INTEGER PRIMARY KEY, Name TEXT)');
	db.beginTransaction();
	db.exec("INSERT INTO t (Name) VALUES ('inside')");
	db.commitTransaction();

	const rows = db.query('SELECT * FROM t');
	const row = rows.current();
	rows.dispose();
	db.close();
	filesystem.remove(f);

	if (!row || row.Name !== 'inside') return `expected the committed row, got ${JSON.stringify(row)}`;
});

dbCheck('Database.js reports lastInsertRowID through its accessor', () => {
	const f = scratchPath('shim-db-acc.db3');
	filesystem.remove(f);

	const db = new Database(f);
	db.open();
	db.exec('CREATE TABLE t (ID INTEGER PRIMARY KEY, Name TEXT)');
	db.exec("INSERT INTO t (Name) VALUES ('x')");
	// This is one of the 89 rewritten accessors.
	const viaAccessor = db.lastInsertRowID;
	const viaMethod = db.getLastInsertRowID();
	db.close();
	filesystem.remove(f);

	if (viaAccessor !== 1) return `accessor gave ${viaAccessor}`;
	if (viaMethod !== 1) return `method gave ${viaMethod}`;
});
