// Copyright (c) 2026 IoTone, Inc. MIT/X License — see LICENSE.txt
//
// SpaceDOMParser.ts — XML/SVG parser and serializer for SpaceDOM
// Adapts the recursive descent approach from SVGXMLParser in SpaceSVG.ts
// to produce full SpaceDOM nodes (SpaceDocument, SpaceElement, SpaceText, SpaceComment).

import {
  SpaceNode,
  SpaceElement,
  SpaceDocument,
  SpaceText,
  SpaceComment,
  SpaceDocumentFragment,
  SpaceAttr,
  _registerParser,
} from './SpaceDOM';

// ─── Constants ──────────────────────────────────────────────────────────────

const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';

// ─── Parse Error ────────────────────────────────────────────────────────────

export class SpaceDOMParseError extends Error {
  public readonly position: number;
  constructor(message: string, position: number) {
    super(`${message} (at position ${position})`);
    this.position = position;
  }
}

// ─── Entity Codec ───────────────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 16)));
}

function encodeEntities(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function encodeAttrValue(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Namespace Stack ────────────────────────────────────────────────────────

interface NsFrame {
  /** prefix -> namespace URI. Empty string key = default namespace. */
  map: Map<string, string>;
}

class NamespaceStack {
  private frames: NsFrame[] = [];

  constructor() {
    // Pre-populate xml prefix (always bound)
    const initial = new Map<string, string>();
    initial.set('xml', XML_NS);
    initial.set('xmlns', XMLNS_NS);
    this.frames.push({ map: initial });
  }

  push(): void {
    this.frames.push({ map: new Map() });
  }

  pop(): void {
    if (this.frames.length > 1) {
      this.frames.pop();
    }
  }

  /** Declare a namespace binding in the current frame. */
  declare(prefix: string, uri: string): void {
    const frame = this.frames[this.frames.length - 1];
    frame.map.set(prefix, uri);
  }

  /** Resolve a prefix to a namespace URI. Empty string = default namespace. */
  resolve(prefix: string): string | null {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const uri = this.frames[i].map.get(prefix);
      if (uri !== undefined) {
        return uri;
      }
    }
    return null;
  }
}

// ─── Internal XML Parser ────────────────────────────────────────────────────

class XMLParser {
  private pos: number = 0;
  private src: string = '';
  private doc!: SpaceDocument;
  private nsStack: NamespaceStack = new NamespaceStack();

  parse(xml: string): SpaceDocument {
    this.pos = 0;
    this.src = xml.trim();
    this.doc = new SpaceDocument();
    this.nsStack = new NamespaceStack();

    this.skipProlog();

    // Parse the root element
    const root = this.parseElement();
    this.doc.appendChild(root);

    // Skip trailing whitespace and comments after root
    this.skipTrailing();

    return this.doc;
  }

  // ─── Prolog / DOCTYPE / PI ──────────────────────────────────────────────

  private skipProlog(): void {
    while (this.pos < this.src.length) {
      this.skipWhitespace();
      if (this.src.startsWith('<?', this.pos)) {
        const end = this.src.indexOf('?>', this.pos);
        if (end === -1) {
          throw new SpaceDOMParseError('Unclosed processing instruction', this.pos);
        }
        this.pos = end + 2;
      } else if (
        this.src.startsWith('<!DOCTYPE', this.pos) ||
        this.src.startsWith('<!doctype', this.pos)
      ) {
        this.skipDoctype();
      } else if (this.src.startsWith('<!--', this.pos)) {
        // Top-level comment before root — skip (comments before root are
        // not typically preserved in the document element tree)
        const end = this.src.indexOf('-->', this.pos);
        if (end === -1) {
          throw new SpaceDOMParseError('Unclosed comment in prolog', this.pos);
        }
        this.pos = end + 3;
      } else {
        break;
      }
    }
  }

  private skipDoctype(): void {
    let depth = 0;
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === '[') {
        depth++;
      } else if (ch === ']') {
        depth--;
      } else if (ch === '>' && depth === 0) {
        this.pos++;
        return;
      }
      this.pos++;
    }
  }

  private skipTrailing(): void {
    while (this.pos < this.src.length) {
      this.skipWhitespace();
      if (this.pos >= this.src.length) break;
      if (this.src.startsWith('<!--', this.pos)) {
        const end = this.src.indexOf('-->', this.pos);
        if (end === -1) {
          throw new SpaceDOMParseError('Unclosed trailing comment', this.pos);
        }
        this.pos = end + 3;
      } else if (this.src.startsWith('<?', this.pos)) {
        const end = this.src.indexOf('?>', this.pos);
        if (end === -1) {
          throw new SpaceDOMParseError('Unclosed trailing processing instruction', this.pos);
        }
        this.pos = end + 2;
      } else {
        break;
      }
    }
  }

  // ─── Element Parsing ────────────────────────────────────────────────────

  private parseElement(): SpaceElement {
    this.skipWhitespace();
    if (this.src[this.pos] !== '<') {
      throw new SpaceDOMParseError('Expected "<"', this.pos);
    }
    this.pos++; // skip '<'

    const qualifiedName = this.readName();

    // First pass: collect raw attributes so we can process xmlns first
    const rawAttrs: Array<{ name: string; value: string }> = [];
    while (this.pos < this.src.length) {
      this.skipWhitespace();
      const ch = this.src[this.pos];
      if (ch === '/' && this.src[this.pos + 1] === '>') {
        break; // self-closing, handle after attribute processing
      }
      if (ch === '>') {
        break; // end of opening tag
      }
      const attrName = this.readName();
      this.skipWhitespace();
      let attrValue = '';
      if (this.src[this.pos] === '=') {
        this.pos++; // skip '='
        this.skipWhitespace();
        attrValue = this.readAttrValue(attrName, qualifiedName);
      }
      rawAttrs.push({ name: attrName, value: attrValue });
    }

    // Push namespace frame and process xmlns declarations first
    this.nsStack.push();
    for (const attr of rawAttrs) {
      if (attr.name === 'xmlns') {
        this.nsStack.declare('', attr.value);
      } else if (attr.name.startsWith('xmlns:')) {
        const prefix = attr.name.slice(6);
        this.nsStack.declare(prefix, attr.value);
      }
    }

    // Resolve the element's namespace
    const colonIdx = qualifiedName.indexOf(':');
    let prefix: string | null = null;
    let localName: string;
    let nsURI: string | null = null;

    if (colonIdx >= 0) {
      prefix = qualifiedName.slice(0, colonIdx);
      localName = qualifiedName.slice(colonIdx + 1);
      nsURI = this.nsStack.resolve(prefix);
    } else {
      localName = qualifiedName;
      nsURI = this.nsStack.resolve(''); // default namespace
    }

    // Create the element
    let element: SpaceElement;
    if (nsURI) {
      element = this.doc.createElementNS(nsURI, qualifiedName);
    } else {
      element = this.doc.createElement(qualifiedName);
    }

    // Set attributes (second pass)
    for (const attr of rawAttrs) {
      const aColonIdx = attr.name.indexOf(':');
      if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) {
        // Namespace declarations — set as regular attributes for serialization fidelity
        element.setAttribute(attr.name, attr.value);
      } else if (aColonIdx >= 0) {
        // Prefixed attribute — resolve namespace
        const aPrefix = attr.name.slice(0, aColonIdx);
        const aNsURI = this.nsStack.resolve(aPrefix);
        if (aNsURI) {
          element.setAttributeNS(aNsURI, attr.name, attr.value);
        } else {
          element.setAttribute(attr.name, attr.value);
        }
      } else {
        element.setAttribute(attr.name, attr.value);
      }
    }

    // Check self-closing vs opening tag
    if (this.src[this.pos] === '/' && this.src[this.pos + 1] === '>') {
      this.pos += 2; // self-closing
      this.nsStack.pop();
      return element;
    }

    if (this.src[this.pos] === '>') {
      this.pos++; // end of opening tag, proceed to children
    }

    // Parse children
    this.parseChildren(element, qualifiedName);

    this.nsStack.pop();
    return element;
  }

  private parseChildren(parent: SpaceElement, tagName: string): void {
    while (this.pos < this.src.length) {
      // Check for closing tag
      if (this.src.startsWith('</', this.pos)) {
        this.pos += 2;
        const closeName = this.readName();
        if (closeName !== tagName) {
          throw new SpaceDOMParseError(
            `Mismatched closing tag: expected </${tagName}>, got </${closeName}>`,
            this.pos
          );
        }
        this.skipWhitespace();
        if (this.src[this.pos] === '>') {
          this.pos++;
        }
        return;
      }

      // Comment
      if (this.src.startsWith('<!--', this.pos)) {
        const end = this.src.indexOf('-->', this.pos);
        if (end === -1) {
          throw new SpaceDOMParseError('Unclosed comment', this.pos);
        }
        const commentData = this.src.slice(this.pos + 4, end);
        const comment = this.doc.createComment(commentData);
        parent.appendChild(comment);
        this.pos = end + 3;
        continue;
      }

      // CDATA
      if (this.src.startsWith('<![CDATA[', this.pos)) {
        const end = this.src.indexOf(']]>', this.pos);
        if (end === -1) {
          throw new SpaceDOMParseError('Unclosed CDATA section', this.pos);
        }
        const cdataContent = this.src.slice(this.pos + 9, end);
        const textNode = this.doc.createTextNode(cdataContent);
        parent.appendChild(textNode);
        this.pos = end + 3;
        continue;
      }

      // Processing instruction inside element (rare but valid)
      if (this.src.startsWith('<?', this.pos)) {
        const end = this.src.indexOf('?>', this.pos);
        if (end === -1) {
          throw new SpaceDOMParseError('Unclosed processing instruction', this.pos);
        }
        this.pos = end + 2;
        continue;
      }

      // Child element
      if (this.src[this.pos] === '<') {
        const child = this.parseElement();
        parent.appendChild(child);
        continue;
      }

      // Text content
      const textEnd = this.src.indexOf('<', this.pos);
      if (textEnd === -1) {
        throw new SpaceDOMParseError(
          `Unexpected end of input inside <${tagName}>`,
          this.pos
        );
      }
      const rawText = this.src.slice(this.pos, textEnd);
      if (rawText.length > 0) {
        const textNode = this.doc.createTextNode(decodeEntities(rawText));
        parent.appendChild(textNode);
      }
      this.pos = textEnd;
    }

    throw new SpaceDOMParseError(`Unclosed tag <${tagName}>`, this.pos);
  }

  // ─── Low-level Readers ──────────────────────────────────────────────────

  private readName(): string {
    const start = this.pos;
    while (
      this.pos < this.src.length &&
      /[a-zA-Z0-9_:\-.]/.test(this.src[this.pos])
    ) {
      this.pos++;
    }
    if (this.pos === start) {
      throw new SpaceDOMParseError('Expected a name', this.pos);
    }
    return this.src.slice(start, this.pos);
  }

  private readAttrValue(attrName: string, tagName: string): string {
    const quote = this.src[this.pos];
    if (quote !== '"' && quote !== "'") {
      throw new SpaceDOMParseError(
        `Expected quote for attribute "${attrName}" on <${tagName}>`,
        this.pos
      );
    }
    this.pos++; // skip opening quote
    const valueEnd = this.src.indexOf(quote, this.pos);
    if (valueEnd === -1) {
      throw new SpaceDOMParseError(
        `Unclosed attribute value for "${attrName}" on <${tagName}>`,
        this.pos
      );
    }
    const raw = this.src.slice(this.pos, valueEnd);
    this.pos = valueEnd + 1; // skip closing quote
    return decodeEntities(raw);
  }

  private skipWhitespace(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) {
      this.pos++;
    }
  }
}

// ─── SpaceDOMParser ─────────────────────────────────────────────────────────

/**
 * Parses an XML/SVG/HTML string into a SpaceDocument.
 *
 * Supports MIME types: `text/xml`, `application/xml`, `image/svg+xml`, `text/html`.
 * For `text/html`, the input is parsed as XML (well-formed HTML / XHTML).
 */
export class SpaceDOMParser {
  parseFromString(
    str: string,
    type: 'text/xml' | 'application/xml' | 'image/svg+xml' | 'text/html'
  ): SpaceDocument {
    // All types are parsed as XML. For text/html we still require well-formed XML.
    // A full HTML parser (tag inference, void elements, etc.) is out of scope.
    const parser = new XMLParser();
    return parser.parse(str);
  }
}

// ─── SpaceXMLSerializer ─────────────────────────────────────────────────────

/**
 * Serializes a SpaceDOM node tree back to an XML string.
 */
export class SpaceXMLSerializer {
  serializeToString(node: SpaceNode): string {
    return serializeNode(node);
  }
}

// ─── Serialization Helpers ──────────────────────────────────────────────────

function serializeNode(node: SpaceNode): string {
  const nodeType = node.nodeType;

  // Element (1)
  if (nodeType === 1) {
    return serializeElement(node as SpaceElement);
  }

  // Text (3)
  if (nodeType === 3) {
    return encodeEntities((node as SpaceText).data);
  }

  // Comment (8)
  if (nodeType === 8) {
    return '<!--' + (node as SpaceComment).data + '-->';
  }

  // Document (9) or DocumentFragment (11)
  if (nodeType === 9 || nodeType === 11) {
    return serializeChildren(node);
  }

  // Fallback: serialize children
  return serializeChildren(node);
}

function serializeElement(el: SpaceElement): string {
  const tag = el.tagName;
  let s = '<' + tag;

  // Serialize attributes
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs.item(i);
    if (attr) {
      s += ' ' + attr.name + '="' + encodeAttrValue(attr.value) + '"';
    }
  }

  // Check for children
  const childNodes = el.childNodes;
  if (childNodes.length === 0) {
    s += '/>';
    return s;
  }

  s += '>';
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes.item(i);
    if (child) {
      s += serializeNode(child);
    }
  }
  s += '</' + tag + '>';
  return s;
}

function serializeChildren(node: SpaceNode): string {
  let s = '';
  const childNodes = node.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    const child = childNodes.item(i);
    if (child) {
      s += serializeNode(child);
    }
  }
  return s;
}

// ─── innerHTML Fragment Parser (registered with SpaceDOM) ───────────────────

/**
 * Parses an HTML/XML fragment string and returns a DocumentFragment
 * containing the parsed nodes, owned by the given document.
 */
function parseHTMLFragment(
  html: string,
  ownerDoc: SpaceDocument
): SpaceNode[] {
  // Wrap in a temporary root so multiple top-level nodes can be parsed
  const wrappedXml = '<_root>' + html + '</_root>';

  let tempDoc: SpaceDocument;
  try {
    const parser = new SpaceDOMParser();
    tempDoc = parser.parseFromString(wrappedXml, 'text/xml');
  } catch (e) {
    // If parsing fails, return empty
    return [];
  }

  const root = tempDoc.documentElement;
  if (!root) return [];

  // Collect children, re-own to target document
  const nodes: SpaceNode[] = [];
  while (root.firstChild) {
    const child = root.firstChild;
    root.removeChild(child);
    nodes.push(ownerDoc.importNode(child, true));
  }
  return nodes;
}

// Register the fragment parser with SpaceDOM so innerHTML setters work
_registerParser(parseHTMLFragment);
