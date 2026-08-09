import { p as parserCtx } from './shared-B6E9QbLK.js';
import { $command, $ctx, $prose } from './milkdown_utils.js';
import { PluginKey, Plugin } from './milkdown_prose_state.js';
import { ReplaceStep } from './milkdown_prose_transform.js';
import { Slice, Fragment } from './milkdown_prose_model.js';
import './milkdown_ctx.js';
import './shared-CFXWASEb.js';
import './milkdown_prose.js';
import './milkdown_prose_inputrules.js';
import './milkdown_transformer.js';
import './shared-Dx24TPyA.js';
import './milkdown_prose_view.js';
import './milkdown_prose_commands.js';

function typeID(type) {
    let cache = type.schema.cached.changeSetIDs || (type.schema.cached.changeSetIDs = Object.create(null));
    let id = cache[type.name];
    if (id == null)
        cache[type.name] = id = Object.keys(type.schema.nodes).indexOf(type.name) + 1;
    return id;
}
// The default token encoder, which encodes node open tokens are
// encoded as strings holding the node name, characters as their
// character code, and node close tokens as negative numbers.
const DefaultEncoder = {
    encodeCharacter: char => char,
    encodeNodeStart: node => node.type.name,
    encodeNodeEnd: node => -typeID(node.type),
    compareTokens: (a, b) => a === b
};
// Convert the given range of a fragment to tokens.
function tokens(frag, encoder, start, end, target) {
    for (let i = 0, off = 0; i < frag.childCount; i++) {
        let child = frag.child(i), endOff = off + child.nodeSize;
        let from = Math.max(off, start), to = Math.min(endOff, end);
        if (from < to) {
            if (child.isText) {
                for (let j = from; j < to; j++)
                    target.push(encoder.encodeCharacter(child.text.charCodeAt(j - off), child.marks));
            }
            else if (child.isLeaf) {
                target.push(encoder.encodeNodeStart(child));
            }
            else {
                if (from == off)
                    target.push(encoder.encodeNodeStart(child));
                tokens(child.content, encoder, Math.max(off + 1, from) - off - 1, Math.min(endOff - 1, to) - off - 1, target);
                if (to == endOff)
                    target.push(encoder.encodeNodeEnd(child));
            }
        }
        off = endOff;
    }
    return target;
}
// The code below will refuse to compute a diff with more than 5000
// insertions or deletions, which takes about 300ms to reach on my
// machine. This is a safeguard against runaway computations.
const MAX_DIFF_SIZE = 5000;
// This obscure mess of constants computes the minimum length of an
// unchanged range (not at the start/end of the compared content). The
// idea is to make it higher in bigger replacements, so that you don't
// get a diff soup of coincidentally identical letters when replacing
// a paragraph.
function minUnchanged(sizeA, sizeB) {
    return Math.min(15, Math.max(2, Math.floor(Math.max(sizeA, sizeB) / 10)));
}
function computeDiff(fragA, fragB, range, encoder = DefaultEncoder) {
    let tokA = tokens(fragA, encoder, range.fromA, range.toA, []);
    let tokB = tokens(fragB, encoder, range.fromB, range.toB, []);
    // Scan from both sides to cheaply eliminate work
    let start = 0, endA = tokA.length, endB = tokB.length;
    let cmp = encoder.compareTokens;
    while (start < tokA.length && start < tokB.length && cmp(tokA[start], tokB[start]))
        start++;
    if (start == tokA.length && start == tokB.length)
        return [];
    while (endA > start && endB > start && cmp(tokA[endA - 1], tokB[endB - 1]))
        endA--, endB--;
    // If the result is simple _or_ too big to cheaply compute, return
    // the remaining region as the diff
    if (endA == start || endB == start || (endA == endB && endA == start + 1))
        return [range.slice(start, endA, start, endB)];
    // This is an implementation of Myers' diff algorithm
    // See https://neil.fraser.name/writing/diff/myers.pdf and
    // https://blog.jcoglan.com/2017/02/12/the-myers-diff-algorithm-part-1/
    let lenA = endA - start, lenB = endB - start;
    let max = Math.min(MAX_DIFF_SIZE, lenA + lenB), off = max + 1;
    let history = [];
    let frontier = [];
    for (let len = off * 2, i = 0; i < len; i++)
        frontier[i] = -1;
    for (let size = 0; size <= max; size++) {
        for (let diag = -size; diag <= size; diag += 2) {
            let next = frontier[diag + 1 + max], prev = frontier[diag - 1 + max];
            let x = next < prev ? prev : next + 1, y = x + diag;
            while (x < lenA && y < lenB && cmp(tokA[start + x], tokB[start + y]))
                x++, y++;
            frontier[diag + max] = x;
            // Found a match
            if (x >= lenA && y >= lenB) {
                // Trace back through the history to build up a set of changed ranges.
                let diff = [], minSpan = minUnchanged(endA - start, endB - start);
                // Used to add steps to a diff one at a time, back to front, merging
                // ones that are less than minSpan tokens apart
                let fromA = -1, toA = -1, fromB = -1, toB = -1;
                let add = (fA, tA, fB, tB) => {
                    if (fromA > -1 && fromA < tA + minSpan) {
                        fromA = fA;
                        fromB = fB;
                    }
                    else {
                        if (fromA > -1)
                            diff.push(range.slice(fromA, toA, fromB, toB));
                        fromA = fA;
                        toA = tA;
                        fromB = fB;
                        toB = tB;
                    }
                };
                for (let i = size - 1; i >= 0; i--) {
                    let next = frontier[diag + 1 + max], prev = frontier[diag - 1 + max];
                    if (next < prev) { // Deletion
                        diag--;
                        x = prev + start;
                        y = x + diag;
                        add(x, x, y, y + 1);
                    }
                    else { // Insertion
                        diag++;
                        x = next + start;
                        y = x + diag;
                        add(x, x + 1, y, y);
                    }
                    frontier = history[i >> 1];
                }
                if (fromA > -1)
                    diff.push(range.slice(fromA, toA, fromB, toB));
                return diff.reverse();
            }
        }
        // Since only either odd or even diagonals are read from each
        // frontier, we only copy them every other iteration.
        if (size % 2 == 0)
            history.push(frontier.slice());
    }
    // The loop exited, meaning the maximum amount of work was done.
    // Just return a change spanning the entire range.
    return [range.slice(start, endA, start, endB)];
}

/**
Stores metadata for a part of a change.
*/
class Span {
    /**
    @internal
    */
    constructor(
    /**
    The length of this span.
    */
    length, 
    /**
    The data associated with this span.
    */
    data) {
        this.length = length;
        this.data = data;
    }
    /**
    @internal
    */
    cut(length) {
        return length == this.length ? this : new Span(length, this.data);
    }
    /**
    @internal
    */
    static slice(spans, from, to) {
        if (from == to)
            return Span.none;
        if (from == 0 && to == Span.len(spans))
            return spans;
        let result = [];
        for (let i = 0, off = 0; off < to; i++) {
            let span = spans[i], end = off + span.length;
            let overlap = Math.min(to, end) - Math.max(from, off);
            if (overlap > 0)
                result.push(span.cut(overlap));
            off = end;
        }
        return result;
    }
    /**
    @internal
    */
    static join(a, b, combine) {
        if (a.length == 0)
            return b;
        if (b.length == 0)
            return a;
        let combined = combine(a[a.length - 1].data, b[0].data);
        if (combined == null)
            return a.concat(b);
        let result = a.slice(0, a.length - 1);
        result.push(new Span(a[a.length - 1].length + b[0].length, combined));
        for (let i = 1; i < b.length; i++)
            result.push(b[i]);
        return result;
    }
    /**
    @internal
    */
    static len(spans) {
        let len = 0;
        for (let i = 0; i < spans.length; i++)
            len += spans[i].length;
        return len;
    }
}
/**
@internal
*/
Span.none = [];
/**
A replaced range with metadata associated with it.
*/
class Change {
    /**
    @internal
    */
    constructor(
    /**
    The start of the range deleted/replaced in the old document.
    */
    fromA, 
    /**
    The end of the range in the old document.
    */
    toA, 
    /**
    The start of the range inserted in the new document.
    */
    fromB, 
    /**
    The end of the range in the new document.
    */
    toB, 
    /**
    Data associated with the deleted content. The length of these
    spans adds up to `this.toA - this.fromA`.
    */
    deleted, 
    /**
    Data associated with the inserted content. Length adds up to
    `this.toB - this.fromB`.
    */
    inserted) {
        this.fromA = fromA;
        this.toA = toA;
        this.fromB = fromB;
        this.toB = toB;
        this.deleted = deleted;
        this.inserted = inserted;
    }
    /**
    @internal
    */
    get lenA() { return this.toA - this.fromA; }
    /**
    @internal
    */
    get lenB() { return this.toB - this.fromB; }
    /**
    @internal
    */
    slice(startA, endA, startB, endB) {
        if (startA == 0 && startB == 0 && endA == this.toA - this.fromA &&
            endB == this.toB - this.fromB)
            return this;
        return new Change(this.fromA + startA, this.fromA + endA, this.fromB + startB, this.fromB + endB, Span.slice(this.deleted, startA, endA), Span.slice(this.inserted, startB, endB));
    }
    /**
    This merges two changesets (the end document of x should be the
    start document of y) into a single one spanning the start of x to
    the end of y.
    */
    static merge(x, y, combine) {
        if (x.length == 0)
            return y;
        if (y.length == 0)
            return x;
        let result = [];
        // Iterate over both sets in parallel, using the middle coordinate
        // system (B in x, A in y) to synchronize.
        for (let iX = 0, iY = 0, curX = x[0], curY = y[0];;) {
            if (!curX && !curY) {
                return result;
            }
            else if (curX && (!curY || curX.toB < curY.fromA)) { // curX entirely in front of curY
                let off = iY ? y[iY - 1].toB - y[iY - 1].toA : 0;
                result.push(off == 0 ? curX :
                    new Change(curX.fromA, curX.toA, curX.fromB + off, curX.toB + off, curX.deleted, curX.inserted));
                curX = iX++ == x.length ? null : x[iX];
            }
            else if (curY && (!curX || curY.toA < curX.fromB)) { // curY entirely in front of curX
                let off = iX ? x[iX - 1].toB - x[iX - 1].toA : 0;
                result.push(off == 0 ? curY :
                    new Change(curY.fromA - off, curY.toA - off, curY.fromB, curY.toB, curY.deleted, curY.inserted));
                curY = iY++ == y.length ? null : y[iY];
            }
            else { // Touch, need to merge
                // The rules for merging ranges are that deletions from the
                // old set and insertions from the new are kept. Areas of the
                // middle document covered by a but not by b are insertions
                // from a that need to be added, and areas covered by b but
                // not a are deletions from b that need to be added.
                let pos = Math.min(curX.fromB, curY.fromA);
                let fromA = Math.min(curX.fromA, curY.fromA - (iX ? x[iX - 1].toB - x[iX - 1].toA : 0)), toA = fromA;
                let fromB = Math.min(curY.fromB, curX.fromB + (iY ? y[iY - 1].toB - y[iY - 1].toA : 0)), toB = fromB;
                let deleted = Span.none, inserted = Span.none;
                // Used to prevent appending ins/del range for the same Change twice
                let enteredX = false, enteredY = false;
                // Need to have an inner loop since any number of further
                // ranges might be touching this group
                for (;;) {
                    let nextX = !curX ? 2e8 : pos >= curX.fromB ? curX.toB : curX.fromB;
                    let nextY = !curY ? 2e8 : pos >= curY.fromA ? curY.toA : curY.fromA;
                    let next = Math.min(nextX, nextY);
                    let inX = curX && pos >= curX.fromB, inY = curY && pos >= curY.fromA;
                    if (!inX && !inY)
                        break;
                    if (inX && pos == curX.fromB && !enteredX) {
                        deleted = Span.join(deleted, curX.deleted, combine);
                        toA += curX.lenA;
                        enteredX = true;
                    }
                    if (inX && !inY) {
                        inserted = Span.join(inserted, Span.slice(curX.inserted, pos - curX.fromB, next - curX.fromB), combine);
                        toB += next - pos;
                    }
                    if (inY && pos == curY.fromA && !enteredY) {
                        inserted = Span.join(inserted, curY.inserted, combine);
                        toB += curY.lenB;
                        enteredY = true;
                    }
                    if (inY && !inX) {
                        deleted = Span.join(deleted, Span.slice(curY.deleted, pos - curY.fromA, next - curY.fromA), combine);
                        toA += next - pos;
                    }
                    if (inX && next == curX.toB) {
                        curX = iX++ == x.length ? null : x[iX];
                        enteredX = false;
                    }
                    if (inY && next == curY.toA) {
                        curY = iY++ == y.length ? null : y[iY];
                        enteredY = false;
                    }
                    pos = next;
                }
                if (fromA < toA || fromB < toB)
                    result.push(new Change(fromA, toA, fromB, toB, deleted, inserted));
            }
        }
    }
    /**
    Deserialize a change from JSON format.
    */
    static fromJSON(json) {
        return new Change(json.fromA, json.toA, json.fromB, json.toB, json.deleted.map(d => new Span(d.length, d.data)), json.inserted.map(d => new Span(d.length, d.data)));
    }
    /**
    Returns a JSON-serializeable object to represent this change.
    */
    toJSON() { return this; }
}

let letter;
// If the runtime support unicode properties in regexps, that's a good
// source of info on whether something is a letter.
try {
    letter = new RegExp("[\\p{Alphabetic}_]", "u");
}
catch (_) { }

/**
A change set tracks the changes to a document from a given point
in the past. It condenses a number of step maps down to a flat
sequence of replacements, and simplifies replacments that
partially undo themselves by comparing their content.
*/
class ChangeSet {
    /**
    @internal
    */
    constructor(
    /**
    @internal
    */
    config, 
    /**
    Replaced regions.
    */
    changes) {
        this.config = config;
        this.changes = changes;
    }
    /**
    Computes a new changeset by adding the given step maps and
    metadata (either as an array, per-map, or as a single value to be
    associated with all maps) to the current set. Will not mutate the
    old set.
    
    Note that due to simplification that happens after each add,
    incrementally adding steps might create a different final set
    than adding all those changes at once, since different document
    tokens might be matched during simplification depending on the
    boundaries of the current changed ranges.
    */
    addSteps(newDoc, maps, data) {
        // This works by inspecting the position maps for the changes,
        // which indicate what parts of the document were replaced by new
        // content, and the size of that new content. It uses these to
        // build up Change objects.
        //
        // These change objects are put in sets and merged together using
        // Change.merge, giving us the changes created by the new steps.
        // Those changes can then be merged with the existing set of
        // changes.
        //
        // For each change that was touched by the new steps, we recompute
        // a diff to try to minimize the change by dropping matching
        // pieces of the old and new document from the change.
        let stepChanges = [];
        // Add spans for new steps.
        for (let i = 0; i < maps.length; i++) {
            let d = Array.isArray(data) ? data[i] : data;
            let off = 0;
            maps[i].forEach((fromA, toA, fromB, toB) => {
                stepChanges.push(new Change(fromA + off, toA + off, fromB, toB, fromA == toA ? Span.none : [new Span(toA - fromA, d)], fromB == toB ? Span.none : [new Span(toB - fromB, d)]));
                off = (toB - fromB) - (toA - fromA);
            });
        }
        if (stepChanges.length == 0)
            return this;
        let newChanges = mergeAll(stepChanges, this.config.combine);
        let changes = Change.merge(this.changes, newChanges, this.config.combine);
        let updated = changes;
        // Minimize changes when possible
        for (let i = 0; i < updated.length; i++) {
            let change = updated[i];
            if (change.fromA == change.toA || change.fromB == change.toB ||
                // Only look at changes that touch newly added changed ranges
                !newChanges.some(r => r.toB > change.fromB && r.fromB < change.toB))
                continue;
            let diff = computeDiff(this.config.doc.content, newDoc.content, change, this.config.encoder);
            // Fast path: If they are completely different, don't do anything
            if (diff.length == 1 && diff[0].fromB == 0 && diff[0].toB == change.toB - change.fromB)
                continue;
            if (updated == changes)
                updated = changes.slice();
            if (diff.length == 1) {
                updated[i] = diff[0];
            }
            else {
                updated.splice(i, 1, ...diff);
                i += diff.length - 1;
            }
        }
        return new ChangeSet(this.config, updated);
    }
    /**
    The starting document of the change set.
    */
    get startDoc() { return this.config.doc; }
    /**
    Map the span's data values in the given set through a function
    and construct a new set with the resulting data.
    */
    map(f) {
        let mapSpan = (span) => {
            let newData = f(span);
            return newData === span.data ? span : new Span(span.length, newData);
        };
        return new ChangeSet(this.config, this.changes.map((ch) => {
            return new Change(ch.fromA, ch.toA, ch.fromB, ch.toB, ch.deleted.map(mapSpan), ch.inserted.map(mapSpan));
        }));
    }
    /**
    Compare two changesets and return the range in which they are
    changed, if any. If the document changed between the maps, pass
    the maps for the steps that changed it as second argument, and
    make sure the method is called on the old set and passed the new
    set. The returned positions will be in new document coordinates.
    */
    changedRange(b, maps) {
        if (b == this)
            return null;
        let touched = maps && touchedRange(maps);
        let moved = touched ? (touched.toB - touched.fromB) - (touched.toA - touched.fromA) : 0;
        function map(p) {
            return !touched || p <= touched.fromA ? p : p + moved;
        }
        let from = touched ? touched.fromB : 2e8, to = touched ? touched.toB : -2e8;
        function add(start, end = start) {
            from = Math.min(start, from);
            to = Math.max(end, to);
        }
        let rA = this.changes, rB = b.changes;
        for (let iA = 0, iB = 0; iA < rA.length && iB < rB.length;) {
            let rangeA = rA[iA], rangeB = rB[iB];
            if (rangeA && rangeB && sameRanges(rangeA, rangeB, map)) {
                iA++;
                iB++;
            }
            else if (rangeB && (!rangeA || map(rangeA.fromB) >= rangeB.fromB)) {
                add(rangeB.fromB, rangeB.toB);
                iB++;
            }
            else {
                add(map(rangeA.fromB), map(rangeA.toB));
                iA++;
            }
        }
        return from <= to ? { from, to } : null;
    }
    /**
    Create a changeset with the given base object and configuration.
    
    The `combine` function is used to compare and combine metadata—it
    should return null when metadata isn't compatible, and a combined
    version for a merged range when it is.
    
    When given, a token encoder determines how document tokens are
    serialized and compared when diffing the content produced by
    changes. The default is to just compare nodes by name and text
    by character, ignoring marks and attributes.
    
    To serialize a change set, you can store its document and
    change array as JSON, and then pass the deserialized (via
    [`Change.fromJSON`](https://prosemirror.net/docs/ref/#changes.Change^fromJSON)) set of changes
    as fourth argument to `create` to recreate the set.
    */
    static create(doc, combine = (a, b) => a === b ? a : null, tokenEncoder = DefaultEncoder, changes = []) {
        return new ChangeSet({ combine, doc, encoder: tokenEncoder }, changes);
    }
}
/**
Exported for testing @internal
*/
ChangeSet.computeDiff = computeDiff;
// Divide-and-conquer approach to merging a series of ranges.
function mergeAll(ranges, combine, start = 0, end = ranges.length) {
    if (end == start + 1)
        return [ranges[start]];
    let mid = (start + end) >> 1;
    return Change.merge(mergeAll(ranges, combine, start, mid), mergeAll(ranges, combine, mid, end), combine);
}
function endRange(maps) {
    let from = 2e8, to = -2e8;
    for (let i = 0; i < maps.length; i++) {
        let map = maps[i];
        if (from != 2e8) {
            from = map.map(from, -1);
            to = map.map(to, 1);
        }
        map.forEach((_s, _e, start, end) => {
            from = Math.min(from, start);
            to = Math.max(to, end);
        });
    }
    return from == 2e8 ? null : { from, to };
}
function touchedRange(maps) {
    let b = endRange(maps);
    if (!b)
        return null;
    let a = endRange(maps.map(m => m.invert()).reverse());
    return { fromA: a.from, toA: a.to, fromB: b.from, toB: b.to };
}
function sameRanges(a, b, map) {
    return map(a.fromB) == b.fromB && map(a.toB) == b.toB &&
        sameSpans(a.deleted, b.deleted) && sameSpans(a.inserted, b.inserted);
}
function sameSpans(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (a[i].length != b[i].length || a[i].data !== b[i].data)
            return false;
    return true;
}

//#region src/__internal__/with-meta.ts
function withMeta(plugin, meta) {
	Object.assign(plugin, { meta: {
		package: "@milkdown/plugin-diff",
		...meta
	} });
	return plugin;
}
//#endregion
//#region src/diff-compute.ts
var LCS_MAX_CHILDREN = 500;
/**
* Create a token encoder that encodes ALL non-default attrs for every node,
* but skips attrs listed in the `ignoreAttrs` map for a given node type.
*/
function createDiffEncoder(ignoreAttrs = {}) {
	const singleMarkCache = /* @__PURE__ */ new WeakMap();
	const markSetCache = /* @__PURE__ */ new WeakMap();
	function encodeMark(m) {
		let token = singleMarkCache.get(m);
		if (token != null) return token;
		const attrs = m.attrs;
		const keys = attrs ? Object.keys(attrs).filter((k) => attrs[k] != null).sort() : [];
		if (keys.length === 0) token = m.type.name;
		else {
			const encoded = {};
			for (const k of keys) encoded[k] = attrs[k];
			token = `${m.type.name}:${JSON.stringify(encoded)}`;
		}
		singleMarkCache.set(m, token);
		return token;
	}
	return {
		encodeCharacter: (char, marks) => {
			if (marks.length === 0) return char;
			let combined = markSetCache.get(marks);
			if (combined == null) {
				combined = marks.map(encodeMark).join(",");
				markSetCache.set(marks, combined);
			}
			return `${char}:${combined}`;
		},
		encodeNodeStart: (node) => {
			const attrs = node.attrs;
			if (attrs && Object.keys(attrs).length > 0) {
				const ignored = ignoreAttrs[node.type.name] ?? [];
				const relevantKeys = Object.keys(attrs).filter((key) => {
					if (ignored.includes(key)) return false;
					const defaultVal = node.type.spec.attrs?.[key]?.default;
					return attrs[key] !== defaultVal;
				});
				if (relevantKeys.length > 0) {
					const encoded = {};
					for (const key of relevantKeys.sort()) encoded[key] = attrs[key];
					return `${node.type.name}:${JSON.stringify(encoded)}`;
				}
			}
			return node.type.name;
		},
		encodeNodeEnd: (node) => {
			const schema = node.type.schema;
			const cache = schema.cached.changeSetIDs || (schema.cached.changeSetIDs = Object.create(null));
			let id = cache[node.type.name];
			if (id == null) cache[node.type.name] = id = Object.keys(schema.nodes).indexOf(node.type.name) + 1;
			return -id;
		},
		compareTokens: (a, b) => a === b
	};
}
function nodeSignature(node, encoder, cache) {
	const cached = cache.get(node);
	if (cached != null) return cached;
	const parts = [String(encoder.encodeNodeStart(node))];
	if (node.isText) {
		const text = node.text;
		for (let i = 0; i < text.length; i++) parts.push(":" + String(encoder.encodeCharacter(text.charCodeAt(i), node.marks)));
	} else node.content.forEach((child) => {
		parts.push("/" + nodeSignature(child, encoder, cache));
	});
	parts.push("\\" + String(encoder.encodeNodeEnd(node)));
	const sig = parts.join("");
	cache.set(node, sig);
	return sig;
}
function makeParentPair(node, contentStart, env) {
	const content = [];
	let offset = 0;
	node.content.forEach((child) => {
		content.push({
			node: child,
			offset,
			size: child.nodeSize,
			signature: nodeSignature(child, env.encoder, env.sigCache)
		});
		offset += child.nodeSize;
	});
	return {
		node,
		contentStart,
		content
	};
}
function lcsMatch(oldList, newList) {
	const n = oldList.length;
	const m = newList.length;
	const dp = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => 0));
	for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) if (oldList[i].signature === newList[j].signature) dp[i][j] = dp[i + 1][j + 1] + 1;
	else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
	const matches = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) if (oldList[i].signature === newList[j].signature) {
		matches.push([i, j]);
		i++;
		j++;
	} else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
	else j++;
	return matches;
}
function canRecurse(oldNode, newNode) {
	if (oldNode.type !== newNode.type) return false;
	const type = oldNode.type;
	if (type.isTextblock) return false;
	if (type.isAtom) return false;
	if (type.spec.code === true) return false;
	if (!type.isBlock) return false;
	return true;
}
function translateChange(change, absA, absB) {
	return Change.fromJSON({
		fromA: change.fromA + absA,
		toA: change.toA + absA,
		fromB: change.fromB + absB,
		toB: change.toB + absB,
		deleted: change.deleted.map((s) => ({
			length: s.length,
			data: s.data
		})),
		inserted: change.inserted.map((s) => ({
			length: s.length,
			data: s.data
		}))
	});
}
function diffPairWithChangeSet(oldSide, newSide, env) {
	const wrapperOld = oldSide.parent.copy(Fragment.from(oldSide.node));
	const wrapperNew = newSide.parent.copy(Fragment.from(newSide.node));
	const step = new ReplaceStep(0, wrapperOld.content.size, new Slice(wrapperNew.content, 0, 0));
	return ChangeSet.create(wrapperOld, void 0, env.encoder).addSteps(wrapperNew, [step.getMap()], null).changes.map((c) => translateChange(c, oldSide.abs, newSide.abs));
}
function anchorOffset(pair, cursor) {
	const list = pair.content;
	if (cursor < list.length) return pair.contentStart + list[cursor].offset;
	if (cursor > 0) {
		const prev = list[cursor - 1];
		return pair.contentStart + prev.offset + prev.size;
	}
	return pair.contentStart + pair.node.content.size;
}
function pureDelete(child, absA, anchorB) {
	return Change.fromJSON({
		fromA: absA,
		toA: absA + child.size,
		fromB: anchorB,
		toB: anchorB,
		deleted: [{
			length: child.size,
			data: null
		}],
		inserted: []
	});
}
function pureInsert(child, anchorA, absB) {
	return Change.fromJSON({
		fromA: anchorA,
		toA: anchorA,
		fromB: absB,
		toB: absB + child.size,
		deleted: [],
		inserted: [{
			length: child.size,
			data: null
		}]
	});
}
function diffContainerContent(oldNode, newNode, oldContentStart, newContentStart, env) {
	const step = new ReplaceStep(0, oldNode.content.size, new Slice(newNode.content, 0, 0));
	return ChangeSet.create(oldNode, void 0, env.encoder).addSteps(newNode, [step.getMap()], null).changes.map((c) => translateChange(c, oldContentStart, newContentStart));
}
function diffChildrenLcs(oldNode, newNode, oldContentStart, newContentStart, env) {
	if (oldNode.childCount > LCS_MAX_CHILDREN || newNode.childCount > LCS_MAX_CHILDREN) return diffContainerContent(oldNode, newNode, oldContentStart, newContentStart, env);
	const oldPair = makeParentPair(oldNode, oldContentStart, env);
	const newPair = makeParentPair(newNode, newContentStart, env);
	const matches = lcsMatch(oldPair.content, newPair.content);
	const result = [];
	let i = 0;
	let j = 0;
	for (const [mi, mj] of matches) {
		processGap(oldPair, newPair, {
			oldStart: i,
			oldEnd: mi,
			newStart: j,
			newEnd: mj
		}, env, result);
		i = mi + 1;
		j = mj + 1;
	}
	processGap(oldPair, newPair, {
		oldStart: i,
		oldEnd: oldPair.content.length,
		newStart: j,
		newEnd: newPair.content.length
	}, env, result);
	return result;
}
function processGap(oldPair, newPair, window, env, out) {
	const oldList = oldPair.content;
	const newList = newPair.content;
	let oi = window.oldStart;
	let ni = window.newStart;
	while (oi < window.oldEnd || ni < window.newEnd) {
		const oldChild = oi < window.oldEnd ? oldList[oi] : null;
		const newChild = ni < window.newEnd ? newList[ni] : null;
		const sameType = oldChild && newChild && oldChild.node.type === newChild.node.type;
		if (oldChild && newChild && sameType) {
			out.push(...diffSameTypePair(oldPair, newPair, oldChild, newChild, env));
			oi++;
			ni++;
			continue;
		}
		if (oldChild && (!newChild || !sameType)) {
			const absA = oldPair.contentStart + oldChild.offset;
			out.push(pureDelete(oldChild, absA, anchorOffset(newPair, ni)));
			oi++;
			continue;
		}
		if (newChild) {
			const absB = newPair.contentStart + newChild.offset;
			out.push(pureInsert(newChild, anchorOffset(oldPair, oi), absB));
			ni++;
		}
	}
}
function diffSameTypePair(oldPair, newPair, oldChild, newChild, env) {
	const absA = oldPair.contentStart + oldChild.offset;
	const absB = newPair.contentStart + newChild.offset;
	if (!(canRecurse(oldChild.node, newChild.node) && attrsEqual(oldChild.node, newChild.node, env.encoder))) return diffPairWithChangeSet({
		node: oldChild.node,
		parent: oldPair.node,
		abs: absA
	}, {
		node: newChild.node,
		parent: newPair.node,
		abs: absB
	}, env);
	return diffChildrenLcs(oldChild.node, newChild.node, absA + 1, absB + 1, env);
}
function attrsEqual(a, b, encoder) {
	return encoder.encodeNodeStart(a) === encoder.encodeNodeStart(b);
}
function buildRangeSubtree(oldDoc, newDoc, from, to, encoder) {
	const $oldFrom = oldDoc.resolve(from);
	const $oldTo = oldDoc.resolve(to);
	const $newFrom = newDoc.resolve(from);
	const $newTo = newDoc.resolve(to);
	const sharedDepth = $oldFrom.sharedDepth(to);
	if ($newFrom.sharedDepth(to) !== sharedDepth) throw new RangeError(`computeDocDiff: range [${from}, ${to}) resolves to different sharedDepth in old and new docs`);
	for (let d = 0; d <= sharedDepth; d++) {
		if (encoder.encodeNodeStart($oldFrom.node(d)) !== encoder.encodeNodeStart($newFrom.node(d))) throw new RangeError(`computeDocDiff: ancestor at depth ${d} differs in type or non-ignored attrs along the path to the shared ancestor`);
		if ($oldFrom.start(d) !== $newFrom.start(d)) throw new RangeError(`computeDocDiff: ancestor at depth ${d} starts at different absolute positions in old and new docs (content before the range differs in size)`);
	}
	const sharedOld = $oldFrom.node(sharedDepth);
	if (sharedOld.isTextblock) throw new RangeError(`computeDocDiff: range [${from}, ${to}) lands inside a textblock; widen the range to a block boundary`);
	if ($oldFrom.depth !== sharedDepth || $oldTo.depth !== sharedDepth || $newFrom.depth !== sharedDepth || $newTo.depth !== sharedDepth) throw new RangeError(`computeDocDiff: range [${from}, ${to}) endpoints must be aligned to child boundaries of the shared ancestor`);
	const sharedNew = $newFrom.node(sharedDepth);
	const ancestorContentStart = $oldFrom.start(sharedDepth);
	const localFrom = from - ancestorContentStart;
	const localTo = to - ancestorContentStart;
	return {
		oldCut: sharedOld.copy(sharedOld.content.cut(localFrom, localTo)),
		newCut: sharedNew.copy(sharedNew.content.cut(localFrom, localTo)),
		cutAbsStart: from
	};
}
function computeDocDiff(oldDoc, newDoc, options) {
	const encoder = createDiffEncoder(options?.ignoreAttrs);
	const env = {
		encoder,
		sigCache: /* @__PURE__ */ new WeakMap()
	};
	const oldSize = oldDoc.content.size;
	const newSize = newDoc.content.size;
	const range = options?.range;
	if (range == null) return diffChildrenLcs(oldDoc, newDoc, 0, 0, env);
	const minSize = Math.min(oldSize, newSize);
	const from = Math.max(0, Math.min(range.from ?? 0, minSize));
	const to = Math.max(from, Math.min(range.to ?? minSize, minSize));
	if (from === to) return [];
	if (from === 0 && to === minSize && oldSize === newSize) return diffChildrenLcs(oldDoc, newDoc, 0, 0, env);
	const subtree = buildRangeSubtree(oldDoc, newDoc, from, to, encoder);
	return diffChildrenLcs(subtree.oldCut, subtree.newCut, subtree.cutAbsStart, subtree.cutAbsStart, env);
}
//#endregion
//#region src/diff-config.ts
var diffConfig = $ctx({ ignoreAttrs: { heading: ["id"] } }, "diffConfig");
withMeta(diffConfig, {
	displayName: "Ctx<diffConfig>",
	group: "Diff"
});
//#endregion
//#region src/diff-plugin.ts
var diffPluginKey = new PluginKey("MILKDOWN_DIFF");
function recomputeChanges(doc, state, options) {
	const changes = computeDocDiff(doc, state.newDoc, options);
	return {
		...state,
		changes
	};
}
function isChangeRejected(change, rejectedRanges) {
	return rejectedRanges.some((r) => change.fromB < r.toB && change.toB > r.fromB);
}
function getPendingChanges(state) {
	return state.changes.filter((c) => !isChangeRejected(c, state.rejectedRanges));
}
var diffPlugin = $prose((ctx) => {
	const config = ctx.get(diffConfig.key);
	return new Plugin({
		key: diffPluginKey,
		state: {
			init: () => null,
			apply(tr, value, _oldEditorState, newEditorState) {
				const action = tr.getMeta(diffPluginKey);
				if (!value) {
					if (action?.type === "start") {
						const changes = computeDocDiff(newEditorState.doc, action.newDoc, { ignoreAttrs: config.ignoreAttrs });
						return {
							newDoc: action.newDoc,
							changes,
							rejectedRanges: [],
							active: true
						};
					}
					return null;
				}
				let state = value;
				if (tr.docChanged && state.active) state = recomputeChanges(newEditorState.doc, state, { ignoreAttrs: config.ignoreAttrs });
				if (!action) return state;
				let result;
				switch (action.type) {
					case "start": {
						const changes = computeDocDiff(newEditorState.doc, action.newDoc, { ignoreAttrs: config.ignoreAttrs });
						return {
							newDoc: action.newDoc,
							changes,
							rejectedRanges: [],
							active: true
						};
					}
					case "accept":
					case "acceptRange":
						result = state;
						break;
					case "reject":
						result = {
							...state,
							rejectedRanges: [...state.rejectedRanges, {
								fromB: action.fromB,
								toB: action.toB
							}]
						};
						break;
					case "rejectRange":
						result = {
							...state,
							rejectedRanges: [...state.rejectedRanges, {
								fromB: action.range.fromB,
								toB: action.range.toB
							}]
						};
						break;
					case "acceptAll":
					case "clear": return null;
					default: return state;
				}
				if (result.active && getPendingChanges(result).length === 0) return null;
				return result;
			}
		},
		filterTransaction(tr, editorState) {
			if (!diffPluginKey.getState(editorState)?.active) return true;
			if (tr.getMeta(diffPluginKey)) return true;
			if (tr.docChanged) return false;
			return true;
		}
	});
});
withMeta(diffPlugin, {
	displayName: "Prose<diff>",
	group: "Diff"
});
//#endregion
//#region src/diff-commands.ts
/**
* Apply pending (non-rejected) changes from last to first.
* Reverse iteration is safe because changeset guarantees
* changes are ordered and non-overlapping.
*/
function applyPendingChanges(tr, diffState) {
	const pending = getPendingChanges(diffState);
	for (let i = pending.length - 1; i >= 0; i--) {
		const change = pending[i];
		const newContent = diffState.newDoc.slice(change.fromB, change.toB);
		tr = tr.replace(change.fromA, change.toA, newContent);
	}
	return tr;
}
var startDiffReviewCmd = $command("StartDiffReview", (ctx) => {
	return (modifiedMarkdown) => (state, dispatch) => {
		if (modifiedMarkdown == null) return false;
		const newDoc = ctx.get(parserCtx)(modifiedMarkdown);
		if (!newDoc) return false;
		if (dispatch) dispatch(state.tr.setMeta(diffPluginKey, {
			type: "start",
			newDoc
		}));
		return true;
	};
});
withMeta(startDiffReviewCmd, {
	displayName: "Command<startDiffReview>",
	group: "Diff"
});
var startDiffReviewFromDocCmd = $command("StartDiffReviewFromDoc", () => {
	return (newDoc) => (state, dispatch) => {
		if (!newDoc) return false;
		if (newDoc.type !== state.doc.type) return false;
		if (dispatch) dispatch(state.tr.setMeta(diffPluginKey, {
			type: "start",
			newDoc
		}));
		return true;
	};
});
withMeta(startDiffReviewFromDocCmd, {
	displayName: "Command<startDiffReviewFromDoc>",
	group: "Diff"
});
var acceptDiffChunkCmd = $command("AcceptDiffChunk", () => {
	return (changeIndex) => (state, dispatch) => {
		if (changeIndex == null) return false;
		const diffState = diffPluginKey.getState(state);
		if (!diffState) return false;
		const change = getPendingChanges(diffState)[changeIndex];
		if (!change) return false;
		if (dispatch) {
			const newContent = diffState.newDoc.slice(change.fromB, change.toB);
			let tr = state.tr.replace(change.fromA, change.toA, newContent);
			tr = tr.setMeta(diffPluginKey, {
				type: "accept",
				changeIndex
			});
			dispatch(tr);
		}
		return true;
	};
});
withMeta(acceptDiffChunkCmd, {
	displayName: "Command<acceptDiffChunk>",
	group: "Diff"
});
var rejectDiffChunkCmd = $command("RejectDiffChunk", () => {
	return (changeIndex) => (state, dispatch) => {
		if (changeIndex == null) return false;
		const diffState = diffPluginKey.getState(state);
		if (!diffState) return false;
		const change = getPendingChanges(diffState)[changeIndex];
		if (!change) return false;
		if (dispatch) dispatch(state.tr.setMeta(diffPluginKey, {
			type: "reject",
			fromB: change.fromB,
			toB: change.toB
		}));
		return true;
	};
});
withMeta(rejectDiffChunkCmd, {
	displayName: "Command<rejectDiffChunk>",
	group: "Diff"
});
var acceptDiffRangeCmd = $command("AcceptDiffRange", () => {
	return (range) => (state, dispatch) => {
		if (!range) return false;
		const diffState = diffPluginKey.getState(state);
		if (!diffState) return false;
		if (dispatch) {
			const newContent = diffState.newDoc.slice(range.fromB, range.toB);
			let tr = state.tr.replace(range.fromA, range.toA, newContent);
			tr = tr.setMeta(diffPluginKey, {
				type: "acceptRange",
				range
			});
			dispatch(tr);
		}
		return true;
	};
});
withMeta(acceptDiffRangeCmd, {
	displayName: "Command<acceptDiffRange>",
	group: "Diff"
});
var rejectDiffRangeCmd = $command("RejectDiffRange", () => {
	return (range) => (state, dispatch) => {
		if (!range) return false;
		if (!diffPluginKey.getState(state)) return false;
		if (dispatch) dispatch(state.tr.setMeta(diffPluginKey, {
			type: "rejectRange",
			range
		}));
		return true;
	};
});
withMeta(rejectDiffRangeCmd, {
	displayName: "Command<rejectDiffRange>",
	group: "Diff"
});
var acceptAllDiffsCmd = $command("AcceptAllDiffs", () => {
	return () => (state, dispatch) => {
		const diffState = diffPluginKey.getState(state);
		if (!diffState) return false;
		if (dispatch) dispatch((diffState.rejectedRanges.length === 0 ? state.tr.replaceWith(0, state.doc.content.size, diffState.newDoc.content) : applyPendingChanges(state.tr, diffState)).setMeta(diffPluginKey, { type: "acceptAll" }));
		return true;
	};
});
withMeta(acceptAllDiffsCmd, {
	displayName: "Command<acceptAllDiffs>",
	group: "Diff"
});
var clearDiffReviewCmd = $command("ClearDiffReview", () => {
	return () => (state, dispatch) => {
		if (!diffPluginKey.getState(state)) return false;
		if (dispatch) dispatch(state.tr.setMeta(diffPluginKey, { type: "clear" }));
		return true;
	};
});
withMeta(clearDiffReviewCmd, {
	displayName: "Command<clearDiffReview>",
	group: "Diff"
});
//#endregion
//#region src/index.ts
var diff = [
	diffConfig,
	diffPlugin,
	startDiffReviewCmd,
	startDiffReviewFromDocCmd,
	acceptDiffChunkCmd,
	acceptDiffRangeCmd,
	rejectDiffChunkCmd,
	rejectDiffRangeCmd,
	acceptAllDiffsCmd,
	clearDiffReviewCmd
];

export { acceptAllDiffsCmd, acceptDiffChunkCmd, acceptDiffRangeCmd, clearDiffReviewCmd, computeDocDiff, diff, diffConfig, diffPlugin, diffPluginKey, getPendingChanges, isChangeRejected, rejectDiffChunkCmd, rejectDiffRangeCmd, startDiffReviewCmd, startDiffReviewFromDocCmd };
//# sourceMappingURL=milkdown_plugin_diff.js.map
