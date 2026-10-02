// One-way sync of TimeVault data into a Joplin notebook.
//
// Reads the SQLite database directly rather than going through the renderer,
// so the sync doesn't depend on the widget being in any particular state.
//
// Structure, under a single top-level "Time Vault" notebook:
//
//   Time Vault/
//     Summary                 — totals across every project
//     <Project name>          — one note per project, with its events
//
// Every note is rewritten from the database on each run. That is the whole
// point of one-way: the notes are a view of the data, and edits made in
// Joplin are lost. Each note says so at the top.

'use strict';

const { DatabaseSync } = require('node:sqlite');

const ROOT_FOLDER = 'Time Vault';

// Repeated at the top of every note, so the warning can't be missed whichever
// note someone opens.
const WARNING = [
	'> [!warning]',
	'> **One-way sync from TimeVault.** This note is regenerated from the',
	'> TimeVault database every time the app syncs. Any edit made here will',
	'> be overwritten without warning — change the data in TimeVault instead.',
].join('\n');

// --- reading the database -------------------------------------------------

function readData(databasePath) {
	const db = new DatabaseSync(databasePath, { enableDoubleQuotedStringLiterals: true });

	try {
		const tables = db.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
		if (!tables.includes('Projects') || !tables.includes('Events')) {
			throw new Error('this does not look like a TimeVault database');
		}

		// The schema gained columns over the widget's life, so only select
		// what's actually there — a 2007 database has neither Archived nor
		// Notes.
		const projectColumns = db.prepare('PRAGMA table_info(Projects)').all().map((r) => r.name);
		const has = (c) => projectColumns.includes(c);

		const projects = db.prepare(`
			SELECT ID AS id, Name AS name
				${has('Archived') ? ', Archived AS archived' : ''}
				${has('Notes') ? ', Notes AS notes' : ''}
				${has('RatePerHour') ? ', RatePerHour AS ratePerHour' : ''}
				${has('TimeBudget') ? ', TimeBudget AS timeBudget' : ''}
			FROM Projects ORDER BY Name
		`).all();

		const events = db.prepare(`
			SELECT ID AS id, ProjectID AS projectId, StartDate AS startDate,
			       EndDate AS endDate, Description AS description
			FROM Events ORDER BY CAST(StartDate AS INTEGER) DESC
		`).all();

		return { projects, events };
	} finally {
		db.close();
	}
}

// --- formatting -----------------------------------------------------------

// Dates are stored as millisecond-epoch strings, as they were in 2007.
function toDate(value) {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? new Date(n) : null;
}

function formatDateTime(value) {
	const d = toDate(value);
	if (!d) return '';
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
		+ ` ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(ms) {
	if (!Number.isFinite(ms) || ms <= 0) return '0:00';
	const totalMinutes = Math.round(ms / 60000);
	const hours = Math.floor(totalMinutes / 60);
	return `${hours}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

function eventDuration(event) {
	const start = toDate(event.startDate);
	const end = toDate(event.endDate);
	if (!start || !end) return 0;
	return Math.max(0, end.getTime() - start.getTime());
}

// A pipe would break the table, and a backslash-escaped one is what Joplin's
// renderer expects.
function escapeCell(text) {
	return String(text == null ? '' : text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function syncedAtLine() {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `*Last synced ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
		+ ` at ${pad(now.getHours())}:${pad(now.getMinutes())}.*`;
}

function buildProjectNote(project, events) {
	const total = events.reduce((sum, e) => sum + eventDuration(e), 0);

	const lines = [WARNING, '', `# ${project.name}`, ''];

	// Only show metadata the project actually has.
	const facts = [];
	if (project.archived) facts.push('**Archived**');
	facts.push(`**Total time:** ${formatDuration(total)}`);
	facts.push(`**Entries:** ${events.length}`);
	if (project.timeBudget) facts.push(`**Budget:** ${project.timeBudget}`);
	if (project.ratePerHour) facts.push(`**Rate per hour:** ${project.ratePerHour}`);
	lines.push(facts.join('  \n'), '');

	if (project.notes) {
		lines.push('## Notes', '', String(project.notes), '');
	}

	lines.push('## Entries', '');

	if (events.length === 0) {
		lines.push('*No time recorded yet.*', '');
	} else {
		lines.push('| Date | Start | End | Duration | Description |');
		lines.push('| --- | --- | --- | ---: | --- |');
		for (const e of events) {
			const start = toDate(e.startDate);
			const end = toDate(e.endDate);
			const pad = (n) => String(n).padStart(2, '0');
			const date = start
				? `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}` : '';
			const startTime = start ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : '';
			const endTime = end ? `${pad(end.getHours())}:${pad(end.getMinutes())}` : '';
			lines.push(`| ${date} | ${startTime} | ${endTime} `
				+ `| ${formatDuration(eventDuration(e))} | ${escapeCell(e.description)} |`);
		}
		lines.push('');
	}

	lines.push('---', '', syncedAtLine());
	return lines.join('\n');
}

function buildSummaryNote(projects, events) {
	const byProject = new Map();
	for (const e of events) {
		const list = byProject.get(e.projectId) || [];
		list.push(e);
		byProject.set(e.projectId, list);
	}

	const rows = projects.map((p) => {
		const list = byProject.get(p.id) || [];
		const total = list.reduce((sum, e) => sum + eventDuration(e), 0);
		const latest = list.reduce((max, e) => {
			const d = toDate(e.startDate);
			return d && (!max || d > max) ? d : max;
		}, null);
		return { project: p, count: list.length, total, latest };
	});

	const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);
	const grandCount = rows.reduce((sum, r) => sum + r.count, 0);

	const lines = [WARNING, '', '# Time Vault', ''];
	lines.push(`**${projects.length}** project${projects.length === 1 ? '' : 's'} · `
		+ `**${grandCount}** entr${grandCount === 1 ? 'y' : 'ies'} · `
		+ `**${formatDuration(grandTotal)}** total`, '');

	lines.push('| Project | Entries | Total time | Last entry |');
	lines.push('| --- | ---: | ---: | --- |');
	for (const r of rows) {
		const name = escapeCell(r.project.name) + (r.project.archived ? ' *(archived)*' : '');
		const last = r.latest ? formatDateTime(r.latest.getTime()) : '—';
		lines.push(`| ${name} | ${r.count} | ${formatDuration(r.total)} | ${last} |`);
	}
	lines.push('');

	lines.push('Each project has its own note in this notebook.', '');
	lines.push('---', '', syncedAtLine());
	return lines.join('\n');
}

// --- the sync -------------------------------------------------------------

// Joplin note titles can't contain a slash without becoming confusing in the
// UI, and an empty title renders as "Untitled".
function safeTitle(name) {
	const cleaned = String(name || '').replace(/[\\/]/g, '-').trim();
	return cleaned || 'Untitled project';
}

async function sync(client, databasePath, { onProgress } = {}) {
	const report = (message) => { if (onProgress) onProgress(message); };

	report('Reading the TimeVault database…');
	const { projects, events } = readData(databasePath);

	report('Finding the Time Vault notebook…');
	const root = await client.ensureFolder(ROOT_FOLDER);

	report('Writing the summary…');
	await client.upsertNote('Summary', buildSummaryNote(projects, events), root.id);

	const eventsByProject = new Map();
	for (const e of events) {
		const list = eventsByProject.get(e.projectId) || [];
		list.push(e);
		eventsByProject.set(e.projectId, list);
	}

	let written = 0;
	for (const project of projects) {
		const title = safeTitle(project.name);
		report(`Writing "${title}"…`);
		await client.upsertNote(
			title, buildProjectNote(project, eventsByProject.get(project.id) || []), root.id);
		written++;
	}

	return {
		folder: ROOT_FOLDER,
		projects: written,
		events: events.length,
	};
}

module.exports = {
	sync,
	readData,
	buildSummaryNote,
	buildProjectNote,
	formatDuration,
	ROOT_FOLDER,
	WARNING,
};
