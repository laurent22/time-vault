#!/usr/bin/env node
//
// Builds a database full of plausible history, for screenshots and demo
// videos. Writes a fresh Events.db3 — it will not overwrite one that already
// exists unless --force is given.
//
//   node tools/make-demo-db.js                  # the dev profile
//   node tools/make-demo-db.js --prod           # the release profile
//   node tools/make-demo-db.js --out /some/path/Events.db3
//   node tools/make-demo-db.js --force          # replace an existing file
//
// Schema notes, learned from a real database rather than the source:
//   - dates are epoch milliseconds stored as TEXT
//   - Events.Description holds the *task id* as a string, not free text;
//     the task's own wording lives in ProjectPossibleTasks.Description
//   - DatabaseVersion holds '1.5'

'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const args = process.argv.slice(2);
const force = args.includes('--force');

function profileDir(prod) {
	const name = prod ? 'TimeVault' : 'TimeVault (dev)';
	if (process.platform === 'darwin') {
		return path.join(os.homedir(), 'Library', 'Application Support', name);
	}
	if (process.platform === 'win32') {
		return path.join(process.env.APPDATA || os.homedir(), name);
	}
	return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), name);
}

const outFlag = args.indexOf('--out');
const target = outFlag !== -1
	? args[outFlag + 1]
	: path.join(profileDir(args.includes('--prod')), 'Events.db3');

// --- the demo data --------------------------------------------------------
//
// Shaped to make the UI show something: one project close to its budget, one
// paid and one unpaid, an archived one, and a spread of entries over the past
// few weeks so the reports aren't empty.

const PROJECTS = [
	{
		name: 'Joplin',
		timeBudget: 40, ratePerHour: null, archived: 0,
		notes: 'Open source, unpaid. Tracking time to see where it actually goes.',
		tasks: ['Reviewing pull requests', 'Release 3.5 preparation', 'Forum support', 'Sync bug — Dropbox'],
		// Roughly how many hours to generate, spread over the window below.
		hours: 18,
	},
	{
		name: 'Freelance — Acme Ltd',
		timeBudget: 25, ratePerHour: '75', archived: 0,
		notes: 'Invoiced monthly. The budget is the retainer; anything above is billed separately.',
		tasks: ['API integration', 'Client call', 'Documentation'],
		// Deliberately near the 25h budget, so the budget column means
		// something on screen.
		hours: 23,
	},
	{
		name: 'Time Vault port',
		timeBudget: 60, ratePerHour: null, archived: 0,
		notes: 'Electron port of the 2008 Yahoo! Widget.',
		tasks: ['Konfabulator shim', 'Joplin sync', 'CI and packaging'],
		hours: 31,
	},
	{
		name: 'Admin',
		timeBudget: null, ratePerHour: null, archived: 0,
		notes: 'The unavoidable overhead.',
		tasks: ['Email', 'Invoicing', 'Backups'],
		hours: 4,
	},
	{
		name: 'Website redesign (2024)',
		timeBudget: 30, ratePerHour: '60', archived: 1,
		notes: 'Finished and invoiced. Kept for the records.',
		tasks: ['Wireframes', 'Build', 'Handover'],
		hours: 28,
	},
];

const DAYS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 28;

// A fixed seed, so re-running produces the same database and a re-recorded
// video matches the previous one.
let seed = 20080428;
function random() {
	seed = (seed * 1103515245 + 12345) % 2147483648;
	return seed / 2147483648;
}

function pick(list) {
	return list[Math.floor(random() * list.length)];
}

// The weekdays in the window, most recent last. Weekends are dropped rather
// than nudged onto the adjacent day — nudging piled Saturday and Sunday both
// onto Friday, giving it three times everyone else's entries.
function weekdaysIn(now, days) {
	const out = [];
	for (let i = days - 1; i >= 0; i--) {
		const day = new Date(now - i * DAYS);
		day.setHours(0, 0, 0, 0);
		const dow = day.getDay();
		if (dow !== 0 && dow !== 6) out.push(day.getTime());
	}
	return out;
}

// Entries land on weekdays during working hours, in sessions of 20-150
// minutes. Each day is filled forward from 09:00 with a gap between
// sessions, so a project's entries can never overlap — a time tracker
// showing two tasks running at once would be obviously wrong on screen.
function generateEntries(project, projectId, taskIds, now) {
	const days = weekdaysIn(now, WINDOW_DAYS);
	const entries = [];
	let remaining = project.hours * 60;

	// Walk the days in a random order so projects don't all start on the
	// same date, but never place two sessions on top of each other.
	const order = days.slice().sort(() => random() - 0.5);

	for (const day of order) {
		if (remaining <= 0) break;
		// Not every project is worked on every day.
		if (random() < 0.45) continue;

		// Start somewhere in the morning, then fill forward.
		let cursor = day + (9 * 60 + Math.floor(random() * 90)) * 60 * 1000;
		const endOfDay = day + 18 * 60 * 60 * 1000;

		while (remaining > 0 && cursor < endOfDay) {
			const minutes = Math.min(remaining, 20 + Math.floor(random() * 130));
			const end = cursor + minutes * 60 * 1000;
			if (end > endOfDay) break;

			entries.push({ projectId, start: cursor, end, taskId: pick(taskIds) });
			remaining -= minutes;

			// A gap of 10-60 minutes before the next session.
			cursor = end + (10 + Math.floor(random() * 50)) * 60 * 1000;
		}
	}

	return entries;
}

// --- writing --------------------------------------------------------------

if (fs.existsSync(target) && !force) {
	console.error(`make-demo-db: ${target} already exists.`);
	console.error('Move it aside, or pass --force to replace it.');
	process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.rmSync(target, { force: true });

const db = new DatabaseSync(target, { enableDoubleQuotedStringLiterals: true });

db.exec(`
	CREATE TABLE DatabaseVersion (DatabaseVersion TEXT);
	CREATE TABLE Events (ID INTEGER PRIMARY KEY, ProjectID NUMERIC, StartDate TEXT, EndDate TEXT, Description TEXT);
	CREATE TABLE EventAutoSave (ProjectID NUMERIC, StartDate TEXT, Duration TEXT, Description TEXT);
	CREATE TABLE ProjectPossibleTasks (ID INTEGER PRIMARY KEY, ProjectID NUMERIC, Description TEXT);
	CREATE TABLE Projects (ID INTEGER PRIMARY KEY, Name TEXT, TimeBudget NUMERIC, RatePerHour TEXT, Notes TEXT, CreatedDate TEXT, Archived NUMERIC);
`);

db.prepare('INSERT INTO DatabaseVersion (DatabaseVersion) VALUES (?)').run('1.5');

const insertProject = db.prepare(
	'INSERT INTO Projects (Name, TimeBudget, RatePerHour, Notes, CreatedDate, Archived) VALUES (?, ?, ?, ?, ?, ?)');
const insertTask = db.prepare(
	'INSERT INTO ProjectPossibleTasks (ProjectID, Description) VALUES (?, ?)');
const insertEvent = db.prepare(
	'INSERT INTO Events (ProjectID, StartDate, EndDate, Description) VALUES (?, ?, ?, ?)');

const now = Date.now();
let totalEntries = 0;

for (const project of PROJECTS) {
	const created = now - (WINDOW_DAYS + 10) * DAYS;
	const { lastInsertRowid: projectId } = insertProject.run(
		project.name,
		project.timeBudget,
		project.ratePerHour,
		project.notes,
		String(created),
		project.archived,
	);

	const taskIds = project.tasks.map(
		(t) => Number(insertTask.run(projectId, t).lastInsertRowid));

	const entries = generateEntries(project, Number(projectId), taskIds, now);
	entries.sort((a, b) => a.start - b.start);

	for (const e of entries) {
		// Description is the task id as a string — see the note at the top.
		insertEvent.run(e.projectId, String(e.start), String(e.end), String(e.taskId));
	}

	totalEntries += entries.length;
	const hours = entries.reduce((sum, e) => sum + (e.end - e.start), 0) / 3600000;
	console.log(`  ${project.name.padEnd(24)} ${String(entries.length).padStart(3)} entries`
		+ `  ${hours.toFixed(1)}h${project.timeBudget ? ` of ${project.timeBudget}h` : ''}`
		+ `${project.archived ? '  (archived)' : ''}`);
}

db.close();

console.log(`\nwrote ${PROJECTS.length} projects and ${totalEntries} entries to`);
console.log(`  ${target}`);
