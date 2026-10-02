// Konfabulator's XMLDOM, used by WidGUI to read its Skin.xml.
//
// Konfabulator's XML API is not the W3C DOM: collections are accessed with
// .item(i) and .length, and nodes are selected with .evaluate(path) returning
// a collection. This wraps the browser's DOMParser in that shape rather than
// rewriting WidGUI's parser, which is only used in one place but iterates
// childNodes and attributes in the Konfabulator style throughout.

'use strict';

(function () {
	// Konfabulator's collections are 1-indexed-looking but actually use
	// .item(i) with 0-based i, plus a .length property.
	function collection(nodes) {
		const arr = Array.from(nodes);
		arr.item = (i) => arr[i] || null;
		return arr;
	}

	function wrapNode(node) {
		if (!node) return null;

		return {
			nodeName: node.nodeName,
			nodeValue: node.nodeValue,
			// Konfabulator exposed element text as .text.
			get text() { return node.textContent; },

			get childNodes() {
				// Konfabulator's childNodes contained elements only; the DOM
				// includes whitespace text nodes, which would break WidGUI's
				// "every child is a style" loop.
				return collection(
					Array.from(node.childNodes)
						.filter((n) => n.nodeType === 1)
						.map(wrapNode),
				);
			},

			get attributes() {
				return collection(
					Array.from(node.attributes || []).map((a) => ({
						name: a.name,
						nodeName: a.name,
						value: a.value,
						nodeValue: a.value,
					})),
				);
			},

			getAttribute: (name) => (node.getAttribute ? node.getAttribute(name) : null),

			evaluate: (path) => evaluateOn(node, path),
		};
	}

	// WidGUI only uses simple element-name paths ("skin"), so this resolves a
	// slash-separated path of child element names rather than implementing
	// XPath.
	function evaluateOn(contextNode, path) {
		const parts = String(path).split('/').filter(Boolean);
		let current = [contextNode];

		for (const part of parts) {
			const next = [];
			for (const n of current) {
				// Match against the document element too, so evaluate("skin")
				// finds the root when called on the document.
				if (n.nodeType === 9 && n.documentElement && n.documentElement.nodeName === part) {
					next.push(n.documentElement);
					continue;
				}
				for (const child of Array.from(n.childNodes || [])) {
					if (child.nodeType === 1 && child.nodeName === part) next.push(child);
				}
			}
			current = next;
		}

		return collection(current.map(wrapNode));
	}

	globalThis.XMLDOM = {
		parse(text) {
			if (!text) return null;
			const doc = new DOMParser().parseFromString(String(text), 'text/xml');
			if (doc.querySelector('parsererror')) {
				console.error('[XMLDOM] parse error');
				return null;
			}
			return {
				evaluate: (path) => evaluateOn(doc, path),
				get documentElement() { return wrapNode(doc.documentElement); },
			};
		},
	};
})();
