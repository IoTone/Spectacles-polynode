# SpaceDOM Design Specification

## Objective

SpaceDOM is a spec-compliant, offscreen DOM implementation for Lens Studio (Snap Spectacles). It provides the standard W3C DOM API in pure TypeScript so that libraries written for browser environments can be ported to Lens Studio with minimal or no modification.

**Non-goals:** SpaceDOM does not render anything. It does not provide `window`, `fetch`, `localStorage`, `history`, or other Web Platform APIs beyond the DOM tree and events. Rendering is handled by consumers (SpaceSVG, SpaceCanvas, or application code).

## Problem Statement

Lens Studio's TypeScript runtime has:
- No `Document`, `Element`, `Node`, or any DOM types (`lib.dom.d.ts` is explicitly excluded in tsconfig)
- No `DOMParser` or `XMLSerializer`
- No browser environment — 26,516 lines of StudioLib.d.ts with zero DOM interfaces
- Only ES2021 standard library (Map, Set, Promise, etc.)

This forces every library that touches DOM (SVG parsers, HTML templating, VDOM diffing, CSS selectors, MathML, etc.) to be rewritten from scratch. SpaceSVG already has a minimal `SVGNode` (5 fields, 5 methods) that could be replaced by a real DOM.

## Target DOM Conformance

SpaceDOM targets **DOM Living Standard (Core)** plus selected interfaces needed for practical library porting:

### Tier 1 — Core Tree (MVP)

| Interface | Key Members |
|-----------|-------------|
| `Node` | `nodeType`, `nodeName`, `nodeValue`, `parentNode`, `parentElement`, `childNodes`, `firstChild`, `lastChild`, `previousSibling`, `nextSibling`, `ownerDocument`, `textContent`, `appendChild()`, `removeChild()`, `insertBefore()`, `replaceChild()`, `cloneNode()`, `contains()`, `hasChildNodes()`, `isEqualNode()`, `normalize()` |
| `Element` extends `Node` | `tagName`, `localName`, `namespaceURI`, `prefix`, `id`, `className`, `attributes` (NamedNodeMap), `getAttribute()`, `setAttribute()`, `removeAttribute()`, `hasAttribute()`, `getElementsByTagName()`, `getElementsByClassName()`, `closest()`, `matches()`, `innerHTML`, `outerHTML`, `children` (HTMLCollection), `firstElementChild`, `lastElementChild`, `childElementCount` |
| `Document` extends `Node` | `documentElement`, `createElement()`, `createElementNS()`, `createTextNode()`, `createComment()`, `createDocumentFragment()`, `getElementById()`, `getElementsByTagName()`, `getElementsByClassName()`, `querySelector()`, `querySelectorAll()`, `importNode()` |
| `DocumentFragment` extends `Node` | `querySelector()`, `querySelectorAll()`, `children`, `firstElementChild`, `lastElementChild`, `childElementCount` |
| `Text` extends `Node` | `data`, `length`, `substringData()`, `appendData()`, `insertData()`, `deleteData()`, `replaceData()`, `splitText()` |
| `Comment` extends `Node` | `data`, `length` |
| `Attr` | `name`, `value`, `namespaceURI`, `prefix`, `localName`, `ownerElement`, `specified` |
| `NodeList` | `length`, `item()`, `forEach()`, `[Symbol.iterator]` |
| `HTMLCollection` | `length`, `item()`, `namedItem()`, `[Symbol.iterator]` |
| `NamedNodeMap` | `length`, `item()`, `getNamedItem()`, `setNamedItem()`, `removeNamedItem()`, `getNamedItemNS()`, `setNamedItemNS()`, `removeNamedItemNS()` |
| `DOMParser` | `parseFromString(str, mimeType)` — supports `text/xml`, `application/xml`, `image/svg+xml`, `text/html` |
| `XMLSerializer` | `serializeToString(node)` |

### Tier 2 — Events

| Interface | Key Members |
|-----------|-------------|
| `EventTarget` | `addEventListener()`, `removeEventListener()`, `dispatchEvent()` |
| `Event` | `type`, `target`, `currentTarget`, `bubbles`, `cancelable`, `defaultPrevented`, `stopPropagation()`, `stopImmediatePropagation()`, `preventDefault()`, `eventPhase` |
| `CustomEvent` extends `Event` | `detail` |
| `MutationObserver` | `observe()`, `disconnect()`, `takeRecords()` |
| `MutationRecord` | `type`, `target`, `addedNodes`, `removedNodes`, `previousSibling`, `nextSibling`, `attributeName`, `oldValue` |

### Tier 3 — CSS Selectors

| Feature | Scope |
|---------|-------|
| `querySelector()` / `querySelectorAll()` | Type, id, class, attribute, descendant, child, sibling combinators, `:first-child`, `:last-child`, `:nth-child()`, `:not()` |
| `Element.matches()` / `Element.closest()` | Same selector subset |

### Out of Scope

- HTML-specific element subclasses (`HTMLDivElement`, `HTMLInputElement`, etc.)
- Layout and rendering (`getBoundingClientRect`, `offsetWidth`, `getComputedStyle`)
- Shadow DOM, Custom Elements
- `Range`, `Selection`, `TreeWalker`, `NodeIterator` (defer to Tier 4 if needed)
- `window`, `navigator`, `location`, `history`, `fetch`, `XMLHttpRequest`

## Implementation Alternatives

### Alternative A: Pure TypeScript from Scratch

Build every interface in pure TypeScript targeting ES2021. No external dependencies.

| Aspect | Assessment |
|--------|-----------|
| **Runtime deps** | Zero |
| **Bundle size** | ~30-60 KB estimated (Tier 1 only) |
| **Node.js built-ins** | None |
| **Port effort** | High — ~2000-4000 lines for Tier 1, ~1000 for Tier 2, ~800 for Tier 3 |
| **Spec fidelity** | Full control; can match spec exactly |
| **Maintenance** | All on us — spec updates require manual tracking |
| **TypeScript types** | Native; types are the implementation |
| **Risk** | Subtle spec deviations discovered late by library consumers |

**Best for:** Maximum control, zero dependency risk, guaranteed Lens Studio compatibility.

### Alternative B: Port slimdom

[slimdom](https://github.com/bwrrp/slimdom.js) — zero-dependency TypeScript DOM implementation. XML-focused.

| Aspect | Assessment |
|--------|-----------|
| **Runtime deps** | Zero |
| **Bundle size** | ~40-80 KB |
| **Node.js built-ins** | None |
| **Port effort** | Low — copy compiled output, verify against ES2021 target |
| **Spec fidelity** | High for XML; no HTML parsing, no `querySelector`, no events |
| **Maintenance** | Upstream maintained; can pull updates |
| **TypeScript types** | Native TypeScript source |
| **Gaps** | No `querySelector`/`querySelectorAll`, no `EventTarget`, no HTML parsing |

**Best for:** SVG/XML-heavy workloads. Would need a CSS selector engine (e.g., `css-select`) and event system added on top.

### Alternative C: Port linkedom (worker build)

[linkedom](https://github.com/WebReflection/linkedom) — lightweight DOM for non-browser runtimes. The `linkedom/worker` export avoids Node.js built-ins.

| Aspect | Assessment |
|--------|-----------|
| **Runtime deps** | 5 (htmlparser2, css-select, cssom, html-escaper, uhyphen) — all portable |
| **Bundle size** | ~269 KB gzipped |
| **Node.js built-ins** | None in worker build |
| **Port effort** | Moderate — bundle with Rollup targeting ES2021, verify no Node.js paths |
| **Spec fidelity** | Good for practical use; not 100% spec-compliant by design (no live collections) |
| **Maintenance** | Actively maintained upstream |
| **TypeScript types** | JS with partial typings; would need `.d.ts` augmentation |
| **Risk** | htmlparser2 bundle may pull in Buffer polyfill; needs verification |

**Best for:** Fastest path to `querySelector` + HTML parsing + events. Most "batteries included."

### Alternative D: Hybrid — slimdom Core + Custom Extensions

Use slimdom for the DOM tree (Tier 1 minus selectors), add a standalone CSS selector engine, and add a custom EventTarget implementation.

| Aspect | Assessment |
|--------|-----------|
| **Runtime deps** | slimdom (0 deps) + css-what/css-select (~20 KB) |
| **Bundle size** | ~60-100 KB |
| **Port effort** | Low-moderate — slimdom is drop-in, selector engine needs bundling |
| **Spec fidelity** | High (slimdom is spec-tested) + good selector coverage |
| **Gaps** | EventTarget/MutationObserver still custom |

**Best for:** Balance of spec fidelity and practical porting effort.

## Recommendation

**Alternative A (Pure TypeScript from Scratch)** for Tier 1, with the architecture designed so slimdom or linkedom can be swapped in later if the maintenance burden proves too high.

Rationale:
- Zero dependency risk in a constrained runtime (Lens Studio)
- The existing `SVGNode` in SpaceSVG proves the approach works; SpaceDOM is its evolution
- Full type safety with no `.d.ts` gaps
- Conformance test suite (below) catches spec deviations early
- `querySelector` (Tier 3) can be deferred — most SVG/MathML libraries use `getElementById` and `getElementsByTagName`
- Bundle size stays minimal (~30-60 KB)

## Architecture

```
Assets/ProjectScripts/
  SpaceDOM.ts              — Core implementation (Node, Element, Document, Text, etc.)
  SpaceDOMParser.ts        — DOMParser + XMLSerializer (reuses/replaces SVGXMLParser)
  SpaceDOMSelectors.ts     — querySelector/querySelectorAll engine (Tier 3, deferred)
  SpaceDOMEvents.ts        — EventTarget, Event, CustomEvent (Tier 2)
  SpaceDOMTestSuite.ts     — Conformance tests
```

### Module Dependencies

```
SpaceSVG.ts ─────┐
SpaceCanvas.ts ──>│── imports SpaceDOM.ts
App code ────────┘         │
                           ├── SpaceDOMParser.ts
                           ├── SpaceDOMEvents.ts (Tier 2)
                           └── SpaceDOMSelectors.ts (Tier 3)
```

### SVGNode Migration Path

SpaceSVG currently uses its own `SVGNode` class. Migration:
1. SpaceDOM's `Element` provides a superset of `SVGNode`'s API
2. `SVGXMLParser` is replaced by `SpaceDOMParser.parseFromString(svg, 'image/svg+xml')`
3. All `SVGNode` call sites (`getAttribute`, `getElementById`, `children`, `parent`, `clone`) map directly to DOM equivalents
4. `SVGNode.clone()` → `Element.cloneNode(true)`
5. `SVGNode.parent` → `Element.parentNode`

## TypeScript API Surface

```typescript
// ─── Node Types ─────────────────────────────────────

declare const enum NodeType {
  ELEMENT_NODE = 1,
  ATTRIBUTE_NODE = 2,
  TEXT_NODE = 3,
  CDATA_SECTION_NODE = 4,
  PROCESSING_INSTRUCTION_NODE = 7,
  COMMENT_NODE = 8,
  DOCUMENT_NODE = 9,
  DOCUMENT_TYPE_NODE = 10,
  DOCUMENT_FRAGMENT_NODE = 11,
}

// ─── Core Interfaces ────────────────────────────────

interface SpaceNode {
  readonly nodeType: number;
  readonly nodeName: string;
  nodeValue: string | null;
  textContent: string | null;

  readonly parentNode: SpaceNode | null;
  readonly parentElement: SpaceElement | null;
  readonly childNodes: SpaceNodeList;
  readonly firstChild: SpaceNode | null;
  readonly lastChild: SpaceNode | null;
  readonly previousSibling: SpaceNode | null;
  readonly nextSibling: SpaceNode | null;
  readonly ownerDocument: SpaceDocument | null;

  appendChild(child: SpaceNode): SpaceNode;
  removeChild(child: SpaceNode): SpaceNode;
  insertBefore(newChild: SpaceNode, refChild: SpaceNode | null): SpaceNode;
  replaceChild(newChild: SpaceNode, oldChild: SpaceNode): SpaceNode;
  cloneNode(deep?: boolean): SpaceNode;
  contains(other: SpaceNode | null): boolean;
  hasChildNodes(): boolean;
  isEqualNode(other: SpaceNode | null): boolean;
  normalize(): void;
}

interface SpaceElement extends SpaceNode {
  readonly tagName: string;
  readonly localName: string;
  readonly namespaceURI: string | null;
  readonly prefix: string | null;
  id: string;
  className: string;

  readonly attributes: SpaceNamedNodeMap;
  readonly children: SpaceHTMLCollection;
  readonly firstElementChild: SpaceElement | null;
  readonly lastElementChild: SpaceElement | null;
  readonly childElementCount: number;

  getAttribute(name: string): string | null;
  getAttributeNS(ns: string | null, localName: string): string | null;
  setAttribute(name: string, value: string): void;
  setAttributeNS(ns: string | null, qualifiedName: string, value: string): void;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
  hasAttributeNS(ns: string | null, localName: string): boolean;
  toggleAttribute(name: string, force?: boolean): boolean;

  getElementsByTagName(tag: string): SpaceHTMLCollection;
  getElementsByTagNameNS(ns: string | null, localName: string): SpaceHTMLCollection;
  getElementsByClassName(classNames: string): SpaceHTMLCollection;

  // Tier 3 (deferred)
  querySelector(selector: string): SpaceElement | null;
  querySelectorAll(selector: string): SpaceNodeList;
  matches(selector: string): boolean;
  closest(selector: string): SpaceElement | null;

  innerHTML: string;
  outerHTML: string;
}

interface SpaceDocument extends SpaceNode {
  readonly documentElement: SpaceElement | null;

  createElement(tagName: string): SpaceElement;
  createElementNS(ns: string | null, qualifiedName: string): SpaceElement;
  createTextNode(data: string): SpaceText;
  createComment(data: string): SpaceComment;
  createDocumentFragment(): SpaceDocumentFragment;
  createAttribute(name: string): SpaceAttr;
  createAttributeNS(ns: string | null, qualifiedName: string): SpaceAttr;

  getElementById(id: string): SpaceElement | null;
  getElementsByTagName(tag: string): SpaceHTMLCollection;
  getElementsByClassName(classNames: string): SpaceHTMLCollection;

  // Tier 3 (deferred)
  querySelector(selector: string): SpaceElement | null;
  querySelectorAll(selector: string): SpaceNodeList;

  importNode(node: SpaceNode, deep?: boolean): SpaceNode;
}

interface SpaceText extends SpaceNode {
  data: string;
  readonly length: number;
  substringData(offset: number, count: number): string;
  appendData(data: string): void;
  insertData(offset: number, data: string): void;
  deleteData(offset: number, count: number): void;
  replaceData(offset: number, count: number, data: string): void;
  splitText(offset: number): SpaceText;
}

interface SpaceComment extends SpaceNode {
  data: string;
  readonly length: number;
}

interface SpaceDocumentFragment extends SpaceNode {
  readonly children: SpaceHTMLCollection;
  readonly firstElementChild: SpaceElement | null;
  readonly lastElementChild: SpaceElement | null;
  readonly childElementCount: number;
  querySelector(selector: string): SpaceElement | null;
  querySelectorAll(selector: string): SpaceNodeList;
}

interface SpaceAttr {
  readonly name: string;
  value: string;
  readonly namespaceURI: string | null;
  readonly prefix: string | null;
  readonly localName: string;
  readonly ownerElement: SpaceElement | null;
  readonly specified: boolean;
}

// ─── Collections ────────────────────────────────────

interface SpaceNodeList {
  readonly length: number;
  item(index: number): SpaceNode | null;
  forEach(callback: (node: SpaceNode, index: number, list: SpaceNodeList) => void): void;
  [Symbol.iterator](): Iterator<SpaceNode>;
}

interface SpaceHTMLCollection {
  readonly length: number;
  item(index: number): SpaceElement | null;
  namedItem(name: string): SpaceElement | null;
  [Symbol.iterator](): Iterator<SpaceElement>;
}

interface SpaceNamedNodeMap {
  readonly length: number;
  item(index: number): SpaceAttr | null;
  getNamedItem(name: string): SpaceAttr | null;
  getNamedItemNS(ns: string | null, localName: string): SpaceAttr | null;
  setNamedItem(attr: SpaceAttr): SpaceAttr | null;
  setNamedItemNS(attr: SpaceAttr): SpaceAttr | null;
  removeNamedItem(name: string): SpaceAttr;
  removeNamedItemNS(ns: string | null, localName: string): SpaceAttr;
  [Symbol.iterator](): Iterator<SpaceAttr>;
}

// ─── Parsing / Serialization ────────────────────────

interface SpaceDOMParser {
  parseFromString(str: string, type: 'text/xml' | 'application/xml' | 'image/svg+xml' | 'text/html'): SpaceDocument;
}

interface SpaceXMLSerializer {
  serializeToString(node: SpaceNode): string;
}

// ─── Events (Tier 2) ───────────────────────────────

interface SpaceEventTarget {
  addEventListener(type: string, listener: (event: SpaceEvent) => void, options?: { capture?: boolean; once?: boolean }): void;
  removeEventListener(type: string, listener: (event: SpaceEvent) => void, options?: { capture?: boolean }): void;
  dispatchEvent(event: SpaceEvent): boolean;
}

interface SpaceEvent {
  readonly type: string;
  readonly target: SpaceEventTarget | null;
  readonly currentTarget: SpaceEventTarget | null;
  readonly eventPhase: number;
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  readonly defaultPrevented: boolean;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
  preventDefault(): void;
}

interface SpaceCustomEvent extends SpaceEvent {
  readonly detail: any;
}
```

## Conformance Test Suite

The test suite runs as a Lens Studio script component (`SpaceDOMTestSuite.ts`). Tests execute on `onAwake()` and log results via `print()`. Each test is a single assertion comparing actual vs expected values.

### Test Categories

| Category | Tests | What It Covers |
|----------|-------|----------------|
| Document creation | 6 | `createElement`, `createTextNode`, `createComment`, `createDocumentFragment`, `createElementNS`, `createAttribute` |
| Tree manipulation | 12 | `appendChild`, `removeChild`, `insertBefore`, `replaceChild`, `parentNode`, `childNodes`, `firstChild`, `lastChild`, `previousSibling`, `nextSibling`, `hasChildNodes`, `contains` |
| Attributes | 10 | `setAttribute`, `getAttribute`, `removeAttribute`, `hasAttribute`, `setAttributeNS`, `getAttributeNS`, `attributes.length`, `attributes.getNamedItem`, `id` shorthand, `className` shorthand |
| Text nodes | 6 | `data`, `length`, `appendData`, `insertData`, `deleteData`, `splitText` |
| Element queries | 8 | `getElementById`, `getElementsByTagName`, `getElementsByClassName`, `getElementsByTagNameNS`, wildcard `*` tag, case sensitivity |
| cloneNode | 4 | Shallow clone, deep clone, attribute independence, subtree independence |
| textContent | 4 | Get on element (concatenates descendants), set on element (replaces children), get on text node, set on text node |
| innerHTML/outerHTML | 4 | Get innerHTML (serializes children), set innerHTML (parses+replaces), outerHTML (includes element itself), entities in attribute values |
| normalize | 2 | Merges adjacent text nodes, removes empty text nodes |
| isEqualNode | 3 | Equal trees, differing attributes, differing children |
| DOMParser | 6 | Parse XML, parse SVG (image/svg+xml), namespace handling, self-closing tags, entities, parse error handling |
| XMLSerializer | 3 | Serialize element, serialize document, namespace prefixes |
| Node types | 4 | Correct `nodeType` constants, `nodeName` for element/text/comment/document |
| Edge cases | 4 | appendChild moves node from old parent, insertBefore with null ref appends, removeChild throws for non-child, cloneNode on document |

**Total: ~76 assertions**

### Example Test Suite Script

```typescript
// SpaceDOMTestSuite.ts — Conformance tests for SpaceDOM
// Add this script to any SceneObject. Tests run on onAwake().

import {
  SpaceDocument, SpaceElement, SpaceText, SpaceDOMParser, SpaceXMLSerializer
} from './SpaceDOM';

@component
export class SpaceDOMTestSuite extends BaseScriptComponent {
  private passed = 0;
  private failed = 0;

  onAwake() {
    print('═══════════════════════════════════════');
    print('[SpaceDOM Test Suite] Running...');
    print('═══════════════════════════════════════');

    this.testDocumentCreation();
    this.testTreeManipulation();
    this.testAttributes();
    this.testTextNodes();
    this.testElementQueries();
    this.testCloneNode();
    this.testTextContent();
    this.testInnerOuterHTML();
    this.testNormalize();
    this.testIsEqualNode();
    this.testDOMParser();
    this.testXMLSerializer();
    this.testNodeTypes();
    this.testEdgeCases();

    print('═══════════════════════════════════════');
    print(`[SpaceDOM Test Suite] ${this.passed} passed, ${this.failed} failed`);
    print('═══════════════════════════════════════');
  }

  private assert(condition: boolean, label: string): void {
    if (condition) {
      this.passed++;
    } else {
      this.failed++;
      print(`  FAIL: ${label}`);
    }
  }

  private assertEqual(actual: any, expected: any, label: string): void {
    this.assert(actual === expected, `${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }

  // ─── Document Creation ──────────────────────────

  private testDocumentCreation(): void {
    print('[TestSuite] Document Creation');
    const doc = new SpaceDocument();

    const el = doc.createElement('div');
    this.assertEqual(el.tagName, 'div', 'createElement tagName');
    this.assertEqual(el.nodeType, 1, 'createElement nodeType');

    const text = doc.createTextNode('hello');
    this.assertEqual(text.data, 'hello', 'createTextNode data');
    this.assertEqual(text.nodeType, 3, 'createTextNode nodeType');

    const comment = doc.createComment('a comment');
    this.assertEqual(comment.data, 'a comment', 'createComment data');
    this.assertEqual(comment.nodeType, 8, 'createComment nodeType');
  }

  // ─── Tree Manipulation ─────────────────────────

  private testTreeManipulation(): void {
    print('[TestSuite] Tree Manipulation');
    const doc = new SpaceDocument();
    const parent = doc.createElement('parent');
    const a = doc.createElement('a');
    const b = doc.createElement('b');
    const c = doc.createElement('c');

    parent.appendChild(a);
    parent.appendChild(b);
    this.assertEqual(parent.childNodes.length, 2, 'appendChild count');
    this.assertEqual(parent.firstChild, a, 'firstChild');
    this.assertEqual(parent.lastChild, b, 'lastChild');
    this.assertEqual(a.nextSibling, b, 'nextSibling');
    this.assertEqual(b.previousSibling, a, 'previousSibling');
    this.assertEqual(a.parentNode, parent, 'parentNode');
    this.assert(parent.contains(a), 'contains child');
    this.assert(!a.contains(parent), 'not contains parent');

    parent.insertBefore(c, b);
    this.assertEqual(parent.childNodes.length, 3, 'insertBefore count');
    this.assertEqual(a.nextSibling, c, 'insertBefore ordering');
    this.assertEqual(c.nextSibling, b, 'insertBefore ordering 2');

    parent.removeChild(c);
    this.assertEqual(parent.childNodes.length, 2, 'removeChild count');
    this.assertEqual(c.parentNode, null, 'removeChild clears parent');
  }

  // ─── Attributes ────────────────────────────────

  private testAttributes(): void {
    print('[TestSuite] Attributes');
    const doc = new SpaceDocument();
    const el = doc.createElement('rect');

    el.setAttribute('width', '100');
    this.assertEqual(el.getAttribute('width'), '100', 'setAttribute/getAttribute');
    this.assert(el.hasAttribute('width'), 'hasAttribute true');
    this.assertEqual(el.attributes.length, 1, 'attributes.length');

    el.removeAttribute('width');
    this.assertEqual(el.getAttribute('width'), null, 'removeAttribute');
    this.assert(!el.hasAttribute('width'), 'hasAttribute false after remove');

    el.id = 'myRect';
    this.assertEqual(el.getAttribute('id'), 'myRect', 'id shorthand sets attribute');
    this.assertEqual(el.id, 'myRect', 'id shorthand gets');

    el.className = 'big red';
    this.assertEqual(el.getAttribute('class'), 'big red', 'className sets class attr');

    el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#foo');
    this.assertEqual(el.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), '#foo', 'setAttributeNS/getAttributeNS');
    this.assertEqual(el.attributes.length, 3, 'attributes count after NS');
  }

  // ─── Text Nodes ────────────────────────────────

  private testTextNodes(): void {
    print('[TestSuite] Text Nodes');
    const doc = new SpaceDocument();
    const t = doc.createTextNode('abcdef');

    this.assertEqual(t.length, 6, 'text length');
    this.assertEqual(t.substringData(2, 3), 'cde', 'substringData');

    t.appendData('gh');
    this.assertEqual(t.data, 'abcdefgh', 'appendData');

    t.deleteData(6, 2);
    this.assertEqual(t.data, 'abcdef', 'deleteData');

    const t2 = t.splitText(3);
    this.assertEqual(t.data, 'abc', 'splitText original');
    this.assertEqual(t2.data, 'def', 'splitText new');
  }

  // ─── Element Queries ───────────────────────────

  private testElementQueries(): void {
    print('[TestSuite] Element Queries');
    const doc = new SpaceDocument();
    const root = doc.createElement('svg');
    doc.appendChild(root);
    const g = doc.createElement('g');
    g.setAttribute('id', 'group1');
    g.className = 'layer primary';
    root.appendChild(g);
    const rect = doc.createElement('rect');
    rect.setAttribute('id', 'r1');
    rect.className = 'primary';
    g.appendChild(rect);
    const circle = doc.createElement('circle');
    g.appendChild(circle);

    this.assertEqual(doc.getElementById('group1'), g, 'getElementById');
    this.assertEqual(doc.getElementById('missing'), null, 'getElementById miss');

    const rects = root.getElementsByTagName('rect');
    this.assertEqual(rects.length, 1, 'getElementsByTagName count');
    this.assertEqual(rects.item(0), rect, 'getElementsByTagName result');

    const all = root.getElementsByTagName('*');
    this.assertEqual(all.length, 3, 'getElementsByTagName wildcard');

    const primaries = root.getElementsByClassName('primary');
    this.assertEqual(primaries.length, 2, 'getElementsByClassName count');

    const layers = root.getElementsByClassName('layer');
    this.assertEqual(layers.length, 1, 'getElementsByClassName single');
  }

  // ─── cloneNode ─────────────────────────────────

  private testCloneNode(): void {
    print('[TestSuite] cloneNode');
    const doc = new SpaceDocument();
    const el = doc.createElement('g');
    el.setAttribute('fill', 'red');
    const child = doc.createElement('rect');
    el.appendChild(child);

    const shallow = el.cloneNode(false) as SpaceElement;
    this.assertEqual(shallow.getAttribute('fill'), 'red', 'shallow clone attrs');
    this.assertEqual(shallow.childNodes.length, 0, 'shallow clone no children');

    const deep = el.cloneNode(true) as SpaceElement;
    this.assertEqual(deep.childNodes.length, 1, 'deep clone has children');
    this.assert(deep.firstChild !== child, 'deep clone children are copies');
  }

  // ─── textContent ───────────────────────────────

  private testTextContent(): void {
    print('[TestSuite] textContent');
    const doc = new SpaceDocument();
    const el = doc.createElement('p');
    el.appendChild(doc.createTextNode('hello '));
    const span = doc.createElement('span');
    span.appendChild(doc.createTextNode('world'));
    el.appendChild(span);

    this.assertEqual(el.textContent, 'hello world', 'textContent get concatenates');

    el.textContent = 'replaced';
    this.assertEqual(el.childNodes.length, 1, 'textContent set replaces children');
    this.assertEqual(el.textContent, 'replaced', 'textContent set value');

    const t = doc.createTextNode('direct');
    this.assertEqual(t.textContent, 'direct', 'textContent on text node');
  }

  // ─── innerHTML / outerHTML ─────────────────────

  private testInnerOuterHTML(): void {
    print('[TestSuite] innerHTML / outerHTML');
    const doc = new SpaceDocument();
    const el = doc.createElement('g');
    el.setAttribute('id', 'g1');
    const rect = doc.createElement('rect');
    rect.setAttribute('x', '10');
    el.appendChild(rect);

    this.assertEqual(el.innerHTML, '<rect x="10"/>', 'innerHTML get');
    this.assertEqual(el.outerHTML, '<g id="g1"><rect x="10"/></g>', 'outerHTML get');

    el.innerHTML = '<circle r="5"/>';
    this.assertEqual(el.childNodes.length, 1, 'innerHTML set child count');
    this.assertEqual((el.firstChild as SpaceElement).tagName, 'circle', 'innerHTML set parsed');
  }

  // ─── normalize ─────────────────────────────────

  private testNormalize(): void {
    print('[TestSuite] normalize');
    const doc = new SpaceDocument();
    const el = doc.createElement('p');
    el.appendChild(doc.createTextNode('a'));
    el.appendChild(doc.createTextNode('b'));
    el.appendChild(doc.createTextNode(''));

    el.normalize();
    this.assertEqual(el.childNodes.length, 1, 'normalize merges adjacent text');
    this.assertEqual(el.textContent, 'ab', 'normalize merged content');
  }

  // ─── isEqualNode ───────────────────────────────

  private testIsEqualNode(): void {
    print('[TestSuite] isEqualNode');
    const doc = new SpaceDocument();
    const a = doc.createElement('rect');
    a.setAttribute('x', '10');
    const b = doc.createElement('rect');
    b.setAttribute('x', '10');
    const c = doc.createElement('rect');
    c.setAttribute('x', '20');

    this.assert(a.isEqualNode(b), 'equal elements');
    this.assert(!a.isEqualNode(c), 'different attr value');
    this.assert(!a.isEqualNode(null), 'not equal to null');
  }

  // ─── DOMParser ─────────────────────────────────

  private testDOMParser(): void {
    print('[TestSuite] DOMParser');
    const parser = new SpaceDOMParser();

    const doc = parser.parseFromString('<svg><rect x="10"/></svg>', 'image/svg+xml');
    this.assert(doc.documentElement !== null, 'parsed has documentElement');
    this.assertEqual(doc.documentElement!.tagName, 'svg', 'parsed root tagName');
    this.assertEqual(doc.documentElement!.childNodes.length, 1, 'parsed child count');

    const rect = doc.documentElement!.firstChild as SpaceElement;
    this.assertEqual(rect.getAttribute('x'), '10', 'parsed attribute');

    const nsDoc = parser.parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>', 'application/xml');
    this.assertEqual(nsDoc.documentElement!.namespaceURI, 'http://www.w3.org/2000/svg', 'namespace parsed');

    // Entity handling
    const entDoc = parser.parseFromString('<r a="x&amp;y"/>', 'text/xml');
    this.assertEqual((entDoc.documentElement as SpaceElement).getAttribute('a'), 'x&y', 'entity decoded');
  }

  // ─── XMLSerializer ─────────────────────────────

  private testXMLSerializer(): void {
    print('[TestSuite] XMLSerializer');
    const doc = new SpaceDocument();
    const el = doc.createElement('svg');
    el.setAttribute('viewBox', '0 0 100 100');
    const rect = doc.createElement('rect');
    rect.setAttribute('fill', 'red');
    el.appendChild(rect);

    const serializer = new SpaceXMLSerializer();
    const xml = serializer.serializeToString(el);
    this.assert(xml.indexOf('viewBox="0 0 100 100"') >= 0, 'serialized viewBox');
    this.assert(xml.indexOf('<rect') >= 0, 'serialized child');
    this.assert(xml.indexOf('fill="red"') >= 0, 'serialized child attr');
  }

  // ─── Node Types ────────────────────────────────

  private testNodeTypes(): void {
    print('[TestSuite] Node Types');
    const doc = new SpaceDocument();
    this.assertEqual(doc.nodeType, 9, 'document nodeType');
    this.assertEqual(doc.createElement('x').nodeType, 1, 'element nodeType');
    this.assertEqual(doc.createTextNode('').nodeType, 3, 'text nodeType');
    this.assertEqual(doc.createComment('').nodeType, 8, 'comment nodeType');
  }

  // ─── Edge Cases ────────────────────────────────

  private testEdgeCases(): void {
    print('[TestSuite] Edge Cases');
    const doc = new SpaceDocument();
    const p1 = doc.createElement('p1');
    const p2 = doc.createElement('p2');
    const child = doc.createElement('child');

    p1.appendChild(child);
    this.assertEqual(child.parentNode, p1, 'child in p1');

    // appendChild moves from old parent
    p2.appendChild(child);
    this.assertEqual(child.parentNode, p2, 'appendChild moves to p2');
    this.assertEqual(p1.childNodes.length, 0, 'old parent loses child');

    // insertBefore with null ref = appendChild
    const x = doc.createElement('x');
    p2.insertBefore(x, null);
    this.assertEqual(p2.lastChild, x, 'insertBefore null appends');

    // removeChild throws for non-child
    let threw = false;
    try { p1.removeChild(x); } catch (e) { threw = true; }
    this.assert(threw, 'removeChild throws for non-child');
  }
}
```

## Implementation Milestones

| Milestone | Deliverable | Est. Lines |
|-----------|-------------|-----------|
| M1 | `SpaceDOM.ts` — Node, Element, Document, Text, Comment, DocumentFragment, Attr, NodeList, HTMLCollection, NamedNodeMap | ~1500 |
| M2 | `SpaceDOMParser.ts` — DOMParser (XML/SVG), XMLSerializer, innerHTML/outerHTML | ~500 |
| M3 | `SpaceDOMTestSuite.ts` — Full conformance suite (76+ assertions) | ~400 |
| M4 | SpaceSVG migration — replace SVGNode with SpaceDOM Element | ~100 (net reduction) |
| M5 | `SpaceDOMEvents.ts` — EventTarget, Event, CustomEvent, MutationObserver (Tier 2) | ~600 |
| M6 | `SpaceDOMSelectors.ts` — querySelector/querySelectorAll engine (Tier 3) | ~800 |

**Total Tier 1 (M1-M4): ~2500 lines, net addition ~2000 after SVGNode removal**
