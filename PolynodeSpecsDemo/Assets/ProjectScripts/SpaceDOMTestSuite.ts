// Copyright (c) 2026 IoTone, Inc. MIT/X License — see LICENSE.txt
//
// SpaceDOMTestSuite.ts — Conformance tests for SpaceDOM
// Add this script to any SceneObject. Tests run automatically on onAwake().
// Check the Lens Studio console for output.

import {
  SpaceNode, SpaceElement, SpaceText, SpaceComment,
  SpaceDocument, SpaceDocumentFragment, SpaceAttr,
  SpaceNodeList, SpaceHTMLCollection, SpaceNamedNodeMap,
  SpaceDOMException,
  ELEMENT_NODE, TEXT_NODE, COMMENT_NODE, DOCUMENT_NODE, DOCUMENT_FRAGMENT_NODE,
} from './SpaceDOM';

import { SpaceDOMParser, SpaceXMLSerializer } from './SpaceDOMParser';

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
    this.testAttributeNS();
    this.testTextNodes();
    this.testElementQueries();
    this.testCloneNode();
    this.testTextContent();
    this.testNormalize();
    this.testIsEqualNode();
    this.testContains();
    this.testDOMParser();
    this.testDOMParserNamespaces();
    this.testXMLSerializer();
    this.testNodeTypes();
    this.testEdgeCases();
    this.testInnerOuterHTML();
    this.testDocumentFragment();
    this.testElementChildren();

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
    const pass = actual === expected;
    if (!pass) {
      this.failed++;
      print(`  FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    } else {
      this.passed++;
    }
  }

  // ─── Document Creation ──────────────────────────

  private testDocumentCreation(): void {
    print('[TestSuite] Document Creation');
    const doc = new SpaceDocument();

    const el = doc.createElement('div');
    this.assertEqual(el.tagName, 'div', 'createElement tagName');
    this.assertEqual(el.nodeType, ELEMENT_NODE, 'createElement nodeType');
    this.assertEqual(el.ownerDocument, doc, 'createElement ownerDocument');

    const text = doc.createTextNode('hello');
    this.assertEqual(text.data, 'hello', 'createTextNode data');
    this.assertEqual(text.nodeType, TEXT_NODE, 'createTextNode nodeType');

    const comment = doc.createComment('a comment');
    this.assertEqual(comment.data, 'a comment', 'createComment data');
    this.assertEqual(comment.nodeType, COMMENT_NODE, 'createComment nodeType');

    const frag = doc.createDocumentFragment();
    this.assertEqual(frag.nodeType, DOCUMENT_FRAGMENT_NODE, 'createDocumentFragment nodeType');

    const attr = doc.createAttribute('fill');
    this.assertEqual(attr.name, 'fill', 'createAttribute name');
    this.assertEqual(attr.value, '', 'createAttribute default value');
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
    this.assertEqual(a.parentNode, parent, 'parentNode after appendChild');
    this.assertEqual(a.parentElement, parent, 'parentElement');

    parent.insertBefore(c, b);
    this.assertEqual(parent.childNodes.length, 3, 'insertBefore count');
    this.assertEqual(a.nextSibling, c, 'insertBefore ordering a->c');
    this.assertEqual(c.nextSibling, b, 'insertBefore ordering c->b');
    this.assertEqual(c.previousSibling, a, 'insertBefore back-link');

    const removed = parent.removeChild(c);
    this.assertEqual(removed, c, 'removeChild returns child');
    this.assertEqual(parent.childNodes.length, 2, 'removeChild count');
    this.assertEqual(c.parentNode, null, 'removeChild clears parentNode');
    this.assertEqual(c.previousSibling, null, 'removeChild clears previousSibling');
    this.assertEqual(c.nextSibling, null, 'removeChild clears nextSibling');
    this.assertEqual(a.nextSibling, b, 'removeChild fixes sibling link');

    const d = doc.createElement('d');
    const replaced = parent.replaceChild(d, b);
    this.assertEqual(replaced, b, 'replaceChild returns old');
    this.assertEqual(parent.lastChild, d, 'replaceChild inserted new');
    this.assertEqual(b.parentNode, null, 'replaceChild detached old');
  }

  // ─── Attributes ────────────────────────────────

  private testAttributes(): void {
    print('[TestSuite] Attributes');
    const doc = new SpaceDocument();
    const el = doc.createElement('rect');

    el.setAttribute('width', '100');
    this.assertEqual(el.getAttribute('width'), '100', 'setAttribute/getAttribute');
    this.assert(el.hasAttribute('width'), 'hasAttribute true');
    this.assertEqual(el.attributes.length, 1, 'attributes.length after set');

    el.setAttribute('width', '200');
    this.assertEqual(el.getAttribute('width'), '200', 'setAttribute overwrites');
    this.assertEqual(el.attributes.length, 1, 'attributes.length after overwrite');

    el.removeAttribute('width');
    this.assertEqual(el.getAttribute('width'), null, 'removeAttribute');
    this.assert(!el.hasAttribute('width'), 'hasAttribute false after remove');
    this.assertEqual(el.attributes.length, 0, 'attributes.length after remove');

    el.id = 'myRect';
    this.assertEqual(el.getAttribute('id'), 'myRect', 'id shorthand sets attribute');
    this.assertEqual(el.id, 'myRect', 'id shorthand gets');

    el.className = 'big red';
    this.assertEqual(el.getAttribute('class'), 'big red', 'className sets class attr');
    this.assertEqual(el.className, 'big red', 'className gets');

    // toggleAttribute
    el.toggleAttribute('hidden');
    this.assert(el.hasAttribute('hidden'), 'toggleAttribute adds');
    el.toggleAttribute('hidden');
    this.assert(!el.hasAttribute('hidden'), 'toggleAttribute removes');
    el.toggleAttribute('hidden', true);
    this.assert(el.hasAttribute('hidden'), 'toggleAttribute force true');
    el.toggleAttribute('hidden', true);
    this.assert(el.hasAttribute('hidden'), 'toggleAttribute force true again');
  }

  // ─── Attribute NS ──────────────────────────────

  private testAttributeNS(): void {
    print('[TestSuite] Attribute NS');
    const doc = new SpaceDocument();
    const el = doc.createElement('use');

    el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#foo');
    this.assertEqual(
      el.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), '#foo',
      'setAttributeNS/getAttributeNS'
    );
    this.assert(
      el.hasAttributeNS('http://www.w3.org/1999/xlink', 'href'),
      'hasAttributeNS'
    );
    this.assertEqual(el.attributes.length, 1, 'NS attr in attributes');

    const attr = el.attributes.getNamedItemNS('http://www.w3.org/1999/xlink', 'href');
    this.assert(attr !== null, 'getNamedItemNS found');
    if (attr) {
      this.assertEqual(attr.localName, 'href', 'NS attr localName');
      this.assertEqual(attr.prefix, 'xlink', 'NS attr prefix');
      this.assertEqual(attr.namespaceURI, 'http://www.w3.org/1999/xlink', 'NS attr namespaceURI');
    }
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

    t.insertData(3, 'XY');
    this.assertEqual(t.data, 'abcXYdef', 'insertData');

    t.replaceData(3, 2, 'Z');
    this.assertEqual(t.data, 'abcZdef', 'replaceData');

    // Reset for splitText
    t.data = 'abcdef';
    const parent = doc.createElement('p');
    parent.appendChild(t);
    const t2 = t.splitText(3);
    this.assertEqual(t.data, 'abc', 'splitText original');
    this.assertEqual(t2.data, 'def', 'splitText new node');
    this.assertEqual(parent.childNodes.length, 2, 'splitText inserted in parent');
    this.assertEqual(t.nextSibling, t2, 'splitText sibling link');
  }

  // ─── Element Queries ───────────────────────────

  private testElementQueries(): void {
    print('[TestSuite] Element Queries');
    const doc = new SpaceDocument();
    const root = doc.createElement('svg');
    doc.appendChild(root);
    const g = doc.createElement('g');
    g.id = 'group1';
    g.className = 'layer primary';
    root.appendChild(g);
    const rect = doc.createElement('rect');
    rect.id = 'r1';
    rect.className = 'primary';
    g.appendChild(rect);
    const circle = doc.createElement('circle');
    g.appendChild(circle);

    // getElementById on Document
    this.assertEqual(doc.getElementById('group1'), g, 'doc.getElementById');
    this.assertEqual(doc.getElementById('r1'), rect, 'doc.getElementById nested');
    this.assertEqual(doc.getElementById('missing'), null, 'doc.getElementById miss');

    // getElementsByTagName on Element (descendants only, not self)
    const rects = root.getElementsByTagName('rect');
    this.assertEqual(rects.length, 1, 'getElementsByTagName count');
    this.assertEqual(rects.item(0), rect, 'getElementsByTagName result');

    const all = root.getElementsByTagName('*');
    this.assertEqual(all.length, 3, 'getElementsByTagName wildcard');

    // getElementsByClassName
    const primaries = root.getElementsByClassName('primary');
    this.assertEqual(primaries.length, 2, 'getElementsByClassName count');

    const layers = root.getElementsByClassName('layer');
    this.assertEqual(layers.length, 1, 'getElementsByClassName single');

    // Multi-class: must have ALL listed classes
    const layerPrimary = root.getElementsByClassName('layer primary');
    this.assertEqual(layerPrimary.length, 1, 'getElementsByClassName multi-class');
    this.assertEqual(layerPrimary.item(0), g, 'getElementsByClassName multi-class result');
  }

  // ─── cloneNode ─────────────────────────────────

  private testCloneNode(): void {
    print('[TestSuite] cloneNode');
    const doc = new SpaceDocument();
    const el = doc.createElement('g');
    el.setAttribute('fill', 'red');
    const child = doc.createElement('rect');
    child.setAttribute('x', '10');
    el.appendChild(child);
    el.appendChild(doc.createTextNode('text'));

    // Shallow clone
    const shallow = el.cloneNode(false) as SpaceElement;
    this.assertEqual(shallow.getAttribute('fill'), 'red', 'shallow clone preserves attrs');
    this.assertEqual(shallow.childNodes.length, 0, 'shallow clone no children');
    this.assertEqual(shallow.parentNode, null, 'clone has no parent');

    // Deep clone
    const deep = el.cloneNode(true) as SpaceElement;
    this.assertEqual(deep.childNodes.length, 2, 'deep clone has children');
    this.assert(deep.firstChild !== child, 'deep clone children are copies');
    this.assertEqual((deep.firstChild as SpaceElement).getAttribute('x'), '10', 'deep clone child attrs');
    this.assertEqual((deep.lastChild as SpaceText).data, 'text', 'deep clone text child');

    // Independence: mutating clone doesn't affect original
    deep.setAttribute('fill', 'blue');
    this.assertEqual(el.getAttribute('fill'), 'red', 'clone attr independent');
    (deep.firstChild as SpaceElement).setAttribute('x', '99');
    this.assertEqual(child.getAttribute('x'), '10', 'deep clone child attr independent');
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

    this.assertEqual(el.textContent, 'hello world', 'textContent get concatenates descendants');

    el.textContent = 'replaced';
    this.assertEqual(el.childNodes.length, 1, 'textContent set replaces children');
    this.assertEqual(el.textContent, 'replaced', 'textContent set value');

    const t = doc.createTextNode('direct');
    this.assertEqual(t.textContent, 'direct', 'textContent on text node');

    t.textContent = 'changed';
    this.assertEqual(t.data, 'changed', 'textContent set on text node changes data');

    // Document textContent is null per spec
    this.assertEqual(doc.textContent, null, 'textContent on document is null');
  }

  // ─── normalize ─────────────────────────────────

  private testNormalize(): void {
    print('[TestSuite] normalize');
    const doc = new SpaceDocument();
    const el = doc.createElement('p');
    el.appendChild(doc.createTextNode('a'));
    el.appendChild(doc.createTextNode('b'));
    el.appendChild(doc.createTextNode(''));
    el.appendChild(doc.createTextNode('c'));

    el.normalize();
    this.assertEqual(el.childNodes.length, 1, 'normalize merges adjacent text');
    this.assertEqual(el.textContent, 'abc', 'normalize merged content');

    // With element between text nodes — should NOT merge across element boundary
    const el2 = doc.createElement('div');
    el2.appendChild(doc.createTextNode('x'));
    el2.appendChild(doc.createElement('br'));
    el2.appendChild(doc.createTextNode('y'));
    el2.normalize();
    this.assertEqual(el2.childNodes.length, 3, 'normalize preserves element boundaries');
  }

  // ─── isEqualNode ───────────────────────────────

  private testIsEqualNode(): void {
    print('[TestSuite] isEqualNode');
    const doc = new SpaceDocument();

    const a = doc.createElement('rect');
    a.setAttribute('x', '10');
    a.appendChild(doc.createTextNode('hi'));

    const b = doc.createElement('rect');
    b.setAttribute('x', '10');
    b.appendChild(doc.createTextNode('hi'));

    const c = doc.createElement('rect');
    c.setAttribute('x', '20');

    this.assert(a.isEqualNode(b), 'equal elements with same attrs and children');
    this.assert(!a.isEqualNode(c), 'different attr value');
    this.assert(!a.isEqualNode(null), 'not equal to null');

    // Different child count
    const d = doc.createElement('rect');
    d.setAttribute('x', '10');
    this.assert(!a.isEqualNode(d), 'different child count');
  }

  // ─── contains ──────────────────────────────────

  private testContains(): void {
    print('[TestSuite] contains');
    const doc = new SpaceDocument();
    const root = doc.createElement('root');
    const child = doc.createElement('child');
    const grandchild = doc.createElement('grandchild');
    root.appendChild(child);
    child.appendChild(grandchild);

    this.assert(root.contains(root), 'contains self');
    this.assert(root.contains(child), 'contains child');
    this.assert(root.contains(grandchild), 'contains grandchild');
    this.assert(!child.contains(root), 'child does not contain ancestor');
    this.assert(!root.contains(null), 'contains null is false');
  }

  // ─── DOMParser ─────────────────────────────────

  private testDOMParser(): void {
    print('[TestSuite] DOMParser');
    const parser = new SpaceDOMParser();

    // Basic XML
    const doc = parser.parseFromString('<svg><rect x="10"/></svg>', 'image/svg+xml');
    this.assert(doc.documentElement !== null, 'parsed has documentElement');
    this.assertEqual(doc.documentElement!.tagName, 'svg', 'parsed root tagName');
    this.assertEqual(doc.documentElement!.childNodes.length, 1, 'parsed child count');

    const rect = doc.documentElement!.firstChild as SpaceElement;
    this.assertEqual(rect.tagName, 'rect', 'parsed child tagName');
    this.assertEqual(rect.getAttribute('x'), '10', 'parsed attribute');

    // Entity handling
    const entDoc = parser.parseFromString('<r a="x&amp;y"/>', 'text/xml');
    this.assertEqual(
      (entDoc.documentElement as SpaceElement).getAttribute('a'), 'x&y',
      'entity decoded in attribute'
    );

    // Text content
    const textDoc = parser.parseFromString('<p>hello <b>world</b></p>', 'text/xml');
    const p = textDoc.documentElement!;
    this.assertEqual(p.textContent, 'hello world', 'parsed text content');
    this.assertEqual(p.childNodes.length, 2, 'mixed text+element children');
    this.assertEqual((p.firstChild as SpaceText).data, 'hello ', 'text node data');

    // Comments
    const commentDoc = parser.parseFromString('<r><!-- comment --></r>', 'text/xml');
    const commentChild = commentDoc.documentElement!.firstChild;
    this.assertEqual(commentChild!.nodeType, COMMENT_NODE, 'comment node parsed');
    this.assertEqual((commentChild as SpaceComment).data, ' comment ', 'comment data');

    // Self-closing
    const selfDoc = parser.parseFromString('<root><br/><hr/></root>', 'text/xml');
    this.assertEqual(selfDoc.documentElement!.childNodes.length, 2, 'self-closing elements');
  }

  // ─── DOMParser Namespaces ──────────────────────

  private testDOMParserNamespaces(): void {
    print('[TestSuite] DOMParser Namespaces');
    const parser = new SpaceDOMParser();

    const doc = parser.parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>',
      'application/xml'
    );
    const svg = doc.documentElement!;
    this.assertEqual(svg.namespaceURI, 'http://www.w3.org/2000/svg', 'default namespace on root');

    const circle = svg.firstChild as SpaceElement;
    this.assertEqual(circle.namespaceURI, 'http://www.w3.org/2000/svg', 'default namespace inherited');

    // Prefixed namespace
    const doc2 = parser.parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
      '<use xlink:href="#foo"/></svg>',
      'text/xml'
    );
    const use = doc2.documentElement!.firstChild as SpaceElement;
    this.assertEqual(
      use.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), '#foo',
      'prefixed attribute namespace'
    );
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
    this.assert(xml.indexOf('viewBox="0 0 100 100"') >= 0, 'serialized viewBox attr');
    this.assert(xml.indexOf('<rect') >= 0, 'serialized child element');
    this.assert(xml.indexOf('fill="red"') >= 0, 'serialized child attr');

    // Text content serialization
    const p = doc.createElement('p');
    p.appendChild(doc.createTextNode('hello & <world>'));
    const pXml = serializer.serializeToString(p);
    this.assert(pXml.indexOf('hello &amp; &lt;world&gt;') >= 0, 'text entities escaped');

    // Comment serialization
    const c = doc.createComment('test comment');
    const cXml = serializer.serializeToString(c);
    this.assertEqual(cXml, '<!--test comment-->', 'comment serialized');

    // Attribute entity escaping
    const el2 = doc.createElement('r');
    el2.setAttribute('a', 'x"y&z');
    const el2Xml = serializer.serializeToString(el2);
    this.assert(el2Xml.indexOf('a="x&quot;y&amp;z"') >= 0, 'attr entities escaped');
  }

  // ─── Node Types ────────────────────────────────

  private testNodeTypes(): void {
    print('[TestSuite] Node Types');
    const doc = new SpaceDocument();

    this.assertEqual(doc.nodeType, DOCUMENT_NODE, 'document nodeType');
    this.assertEqual(doc.nodeName, '#document', 'document nodeName');

    this.assertEqual(doc.createElement('x').nodeType, ELEMENT_NODE, 'element nodeType');
    this.assertEqual(doc.createElement('div').nodeName, 'div', 'element nodeName');

    this.assertEqual(doc.createTextNode('').nodeType, TEXT_NODE, 'text nodeType');
    this.assertEqual(doc.createTextNode('').nodeName, '#text', 'text nodeName');

    this.assertEqual(doc.createComment('').nodeType, COMMENT_NODE, 'comment nodeType');
    this.assertEqual(doc.createComment('').nodeName, '#comment', 'comment nodeName');

    this.assertEqual(doc.createDocumentFragment().nodeType, DOCUMENT_FRAGMENT_NODE, 'fragment nodeType');
    this.assertEqual(doc.createDocumentFragment().nodeName, '#document-fragment', 'fragment nodeName');

    // Static constants on SpaceNode
    this.assertEqual(SpaceNode.ELEMENT_NODE, 1, 'SpaceNode.ELEMENT_NODE');
    this.assertEqual(SpaceNode.TEXT_NODE, 3, 'SpaceNode.TEXT_NODE');
    this.assertEqual(SpaceNode.COMMENT_NODE, 8, 'SpaceNode.COMMENT_NODE');
    this.assertEqual(SpaceNode.DOCUMENT_NODE, 9, 'SpaceNode.DOCUMENT_NODE');
    this.assertEqual(SpaceNode.DOCUMENT_FRAGMENT_NODE, 11, 'SpaceNode.DOCUMENT_FRAGMENT_NODE');
  }

  // ─── Edge Cases ────────────────────────────────

  private testEdgeCases(): void {
    print('[TestSuite] Edge Cases');
    const doc = new SpaceDocument();
    const p1 = doc.createElement('p1');
    const p2 = doc.createElement('p2');
    const child = doc.createElement('child');

    // appendChild reparents (moves from old parent)
    p1.appendChild(child);
    this.assertEqual(child.parentNode, p1, 'child in p1');
    p2.appendChild(child);
    this.assertEqual(child.parentNode, p2, 'appendChild moves to p2');
    this.assertEqual(p1.childNodes.length, 0, 'old parent loses child');
    this.assertEqual(p2.childNodes.length, 1, 'new parent has child');

    // insertBefore with null ref = appendChild
    const x = doc.createElement('x');
    p2.insertBefore(x, null);
    this.assertEqual(p2.lastChild, x, 'insertBefore null appends');

    // removeChild throws for non-child
    let threw = false;
    try { p1.removeChild(x); } catch (e) { threw = true; }
    this.assert(threw, 'removeChild throws for non-child');

    // Hierarchy error: can't append ancestor to descendant
    const outer = doc.createElement('outer');
    const inner = doc.createElement('inner');
    outer.appendChild(inner);
    let hierarchyError = false;
    try { inner.appendChild(outer); } catch (e) { hierarchyError = true; }
    this.assert(hierarchyError, 'appendChild throws HierarchyRequestError');

    // nodeValue for elements is null
    const el = doc.createElement('div');
    this.assertEqual(el.nodeValue, null, 'element nodeValue is null');

    // nodeValue for text
    const t = doc.createTextNode('hi');
    this.assertEqual(t.nodeValue, 'hi', 'text nodeValue');
    t.nodeValue = 'bye';
    this.assertEqual(t.data, 'bye', 'text nodeValue setter');
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

    // innerHTML getter
    const inner = el.innerHTML;
    this.assert(inner.indexOf('<rect') >= 0, 'innerHTML contains child');
    this.assert(inner.indexOf('x="10"') >= 0, 'innerHTML contains child attr');
    this.assert(inner.indexOf('<g') < 0, 'innerHTML does not contain self');

    // outerHTML getter
    const outer = el.outerHTML;
    this.assert(outer.indexOf('<g') >= 0, 'outerHTML contains self');
    this.assert(outer.indexOf('id="g1"') >= 0, 'outerHTML contains self attr');
    this.assert(outer.indexOf('<rect') >= 0, 'outerHTML contains child');

    // innerHTML setter (requires SpaceDOMParser to be loaded)
    el.innerHTML = '<circle r="5"/>';
    this.assertEqual(el.childNodes.length, 1, 'innerHTML set child count');
    this.assertEqual((el.firstChild as SpaceElement).tagName, 'circle', 'innerHTML set parsed element');
    this.assertEqual((el.firstChild as SpaceElement).getAttribute('r'), '5', 'innerHTML set parsed attr');
  }

  // ─── DocumentFragment ──────────────────────────

  private testDocumentFragment(): void {
    print('[TestSuite] DocumentFragment');
    const doc = new SpaceDocument();
    const frag = doc.createDocumentFragment();
    const a = doc.createElement('a');
    const b = doc.createElement('b');
    const c = doc.createElement('c');
    frag.appendChild(a);
    frag.appendChild(b);
    frag.appendChild(c);

    this.assertEqual(frag.childNodes.length, 3, 'fragment has children');

    // appendChild with fragment moves all children to target, fragment becomes empty
    const parent = doc.createElement('parent');
    parent.appendChild(frag);
    this.assertEqual(parent.childNodes.length, 3, 'fragment children moved to parent');
    this.assertEqual(frag.childNodes.length, 0, 'fragment is empty after append');
    this.assertEqual(parent.firstChild, a, 'first fragment child');
    this.assertEqual(parent.lastChild, c, 'last fragment child');
    this.assertEqual(a.parentNode, parent, 'fragment child reparented');
  }

  // ─── Element children / firstElementChild etc ──

  private testElementChildren(): void {
    print('[TestSuite] Element Children');
    const doc = new SpaceDocument();
    const parent = doc.createElement('div');
    parent.appendChild(doc.createTextNode('text1'));
    const span = doc.createElement('span');
    parent.appendChild(span);
    parent.appendChild(doc.createTextNode('text2'));
    const p = doc.createElement('p');
    parent.appendChild(p);

    // children should only include elements
    this.assertEqual(parent.children.length, 2, 'children count (elements only)');
    this.assertEqual(parent.children.item(0), span, 'children[0]');
    this.assertEqual(parent.children.item(1), p, 'children[1]');

    this.assertEqual(parent.firstElementChild, span, 'firstElementChild');
    this.assertEqual(parent.lastElementChild, p, 'lastElementChild');
    this.assertEqual(parent.childElementCount, 2, 'childElementCount');

    // childNodes includes all node types
    this.assertEqual(parent.childNodes.length, 4, 'childNodes count (all types)');
  }
}
