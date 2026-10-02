#!/usr/bin/env node
//
// Rewrites Konfabulator's non-standard accessor syntax into Object.defineProperty.
//
// Konfabulator (a SpiderMonkey fork) accepted:
//
//     Foo.prototype.bar setter = function(v) { ... }
//     Foo.prototype.bar getter = function()  { ... }
//
// which is a syntax error in any standard engine, so nothing in the original
// source parses until this pass has run.
//
// ES6 get/set syntax isn't a usable target here: the getter and setter for one
// property are separate top-level statements, frequently non-adjacent and with
// unrelated code between them, and one site (FrameWrapper.js) uses a computed
// property name inside a loop. defineProperty handles all of those uniformly.
//
// Accessors are defined with configurable:true so that a later definition of
// the same property replaces the earlier one instead of throwing — the
// original relies on redefinition in a couple of places.
//
// Usage: node fix-accessors.js <file>...        (rewrites in place)
//        node fix-accessors.js --check <file>...  (reports, writes nothing)

'use strict';

const fs = require('node:fs');

// Matches `<target> setter = ` / `<target> getter = ` at the start of a
// statement. The target is either a dotted path (Foo.prototype.bar) or a
// dotted path ending in a computed index (FrameWrapper.prototype[iName]).
const ACCESSOR = /^([ \t]*)((?:[A-Za-z_$][\w$]*)(?:\.[A-Za-z_$][\w$]*)*?)(?:\.([A-Za-z_$][\w$]*)|\[([^\]]+)\])[ \t]+(setter|getter)[ \t]*=[ \t]*/gm;

// Walks forward from the end of the `=` to find the end of the assigned
// expression, so that function bodies containing braces, strings, comments or
// regexes are handled correctly rather than by brace counting alone.
function findExpressionEnd(src, start) {
	let i = start;
	let depth = 0;
	let seenBody = false;

	while (i < src.length) {
		const c = src[i];

		// Skip over string literals.
		if (c === '"' || c === "'") {
			const quote = c;
			i++;
			while (i < src.length) {
				if (src[i] === '\\') { i += 2; continue; }
				if (src[i] === quote) { i++; break; }
				i++;
			}
			continue;
		}

		// Skip over comments.
		if (c === '/' && src[i + 1] === '/') {
			while (i < src.length && src[i] !== '\n') i++;
			continue;
		}
		if (c === '/' && src[i + 1] === '*') {
			i += 2;
			while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
			i += 2;
			continue;
		}

		if (c === '{' || c === '(' || c === '[') { depth++; i++; seenBody = true; continue; }
		if (c === '}' || c === ')' || c === ']') {
			depth--;
			i++;
			// A function literal ends at the brace that closes its body.
			if (depth === 0 && seenBody && c === '}') return i;
			continue;
		}

		// A bare identifier assignment (`... setter = s;`) ends at the
		// semicolon or newline.
		if (depth === 0 && (c === ';' || c === '\n')) return i;

		i++;
	}

	return src.length;
}

function transform(src) {
	const edits = [];

	ACCESSOR.lastIndex = 0;
	let m;
	while ((m = ACCESSOR.exec(src)) !== null) {
		const [full, indent, target, dotName, computedName, kind] = m;
		const exprStart = m.index + full.length;
		const exprEnd = findExpressionEnd(src, exprStart);
		const expr = src.slice(exprStart, exprEnd).trim().replace(/;$/, '');

		// Quote a literal name; pass a computed one through as an expression.
		const key = dotName !== undefined ? JSON.stringify(dotName) : computedName;
		const accessor = kind === 'setter' ? 'set' : 'get';

		const replacement =
			`${indent}Object.defineProperty(${target}, ${key}, { ` +
			`${accessor}: ${expr}, configurable: true, enumerable: true });`;

		edits.push({ start: m.index, end: exprEnd, replacement });
	}

	// Trailing semicolons left over after an edit would produce stray `;;`.
	let out = '';
	let last = 0;
	for (const e of edits) {
		out += src.slice(last, e.start) + e.replacement;
		last = e.end;
		if (src[last] === ';') last++;
	}
	out += src.slice(last);

	return { out, count: edits.length };
}

function main() {
	const args = process.argv.slice(2);
	const check = args[0] === '--check';
	const files = check ? args.slice(1) : args;

	if (files.length === 0) {
		console.error('usage: fix-accessors.js [--check] <file>...');
		process.exit(2);
	}

	let total = 0;
	for (const file of files) {
		const src = fs.readFileSync(file, 'utf8');
		const { out, count } = transform(src);
		if (count === 0) continue;
		total += count;
		if (!check) fs.writeFileSync(file, out);
		console.log(`${count === 1 ? ' 1' : String(count).padStart(2)}  ${file}`);
	}
	console.log(`${check ? 'would rewrite' : 'rewrote'} ${total} accessors in ${files.length} files`);
}

main();
