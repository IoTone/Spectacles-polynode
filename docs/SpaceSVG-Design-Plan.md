# SpaceSVG Design Plan

## Overview

SpaceSVG is a library for Snap Spectacles (Lens Studio 5.15.4) that converts SVG files into Lens Script API-compatible spatial visuals. The goal is to parse and render responsive SVGs, pass SVG conformance tests, and output via native `RenderMeshVisual` using `MeshBuilder`.

## Critical Constraints

### WebView Is Not an Option

WebView on Spectacles causes the device to overheat and drains the battery rapidly. **All WebView-based approaches are ruled out** — no render-once WebView, no Canvas-via-WebView. SpaceSVG uses native mesh rendering exclusively.

### MeshBuilder on Spectacles

Previous testing found that **MeshBuilder meshes created at runtime don't render on Spectacles**. However, this may have been a specific case (e.g., incorrect material, missing shader). The `LineRenderer` in SIK does use MeshBuilder successfully with `TriangleStrip` topology and a custom shader. This needs re-testing.

### No DOMParser

Lens Studio's TypeScript runtime has no browser DOM APIs. SVG XML must be parsed with a custom parser unless jsdom can be ported (see below).

## Architecture: Native Mesh Rendering

Convert SVG elements directly to triangulated meshes via `MeshBuilder`, assigned to `RenderMeshVisual` with an unlit material. No WebView involved — zero energy overhead beyond the initial parse.

**Pipeline:** SVG string → XML parse → SVGNode tree → style resolution → path commands → triangulated meshes → MeshBuilder → RenderMeshVisual

**Pros:** No WebView, no overheating, fully native rendering, supports dynamic manipulation
**Cons:** Must implement SVG path triangulation, limited gradient/filter/text support initially

## Required Experiment (Before Implementation)

### MeshBuilder Viability

Create a minimal test script that:

1. Creates a `MeshBuilder` with position (3) + color (4) vertex layout
2. Builds a single colored triangle using `Triangles` topology
3. Assigns it to a `RenderMeshVisual` with an unlit material
4. Tests on actual Spectacles hardware

**If it renders:** Proceed with full implementation.

**If it doesn't:** Investigate material/shader requirements. The SIK `LineRenderer` proves MeshBuilder can work on device — determine what configuration it uses and replicate.

## Module Design

### Core Modules

```
Assets/ProjectScripts/
  SpaceSVG.ts              — Main library (parser, renderer, API)
  SpaceSVGDemo.ts          — Demo component
  SpaceSVGTestSuite.ts     — Conformance test SVGs
```

### Internal Components

| Component | Purpose |
|---|---|
| `SVGXMLParser` | Recursive-descent XML parser (pure TypeScript) |
| `SVGNode` | Lightweight DOM-like tree: `tagName`, `attributes`, `children` |
| `SVGStyleResolver` | Cascade and inherit presentation attributes |
| `SVGPathParser` | Parse `d` attribute into command list |
| `SVGTriangulator` | Convert paths/shapes to triangle meshes |
| `SpaceSVGMeshBackend` | SVGNode tree → MeshBuilder → RenderMeshVisual |
| `SpaceSVG` | Public API |

## jsdom Porting Consideration

If jsdom can be ported to the Lens Studio runtime, it would replace `SVGXMLParser`, `SVGNode`, and `SVGStyleResolver` entirely.

### What jsdom provides

- Real DOM API: `querySelector`, `getElementById`, `getComputedStyle`
- Correct XML parsing: entities, namespaces, self-closing tags
- Style cascade and specificity

### What jsdom doesn't provide

- Rendering (still need the mesh backend)
- SVG geometry methods (`getBBox`, `getTotalLength`) — typically stubs
- Canvas 2D (requires native bindings)

### Porting challenges

- jsdom depends on Node.js built-ins (`fs`, `url`, `http`, `buffer`, `stream`)
- Bundle size ~2MB minified

### Recommendation

Build with the custom parser first. Design the interface so jsdom can be swapped in later if ported.

## SVG Feature Roadmap

### Phase 1: Core Geometry

- `<svg>` root with `viewBox`, `width`, `height`, `preserveAspectRatio`
- Basic shapes: `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>`
- `<path>` with full `d` attribute (M, L, H, V, C, S, Q, T, A, Z — absolute and relative)
- `<g>` grouping with `transform`
- Presentation attributes: `fill`, `stroke`, `stroke-width`, `opacity`
- Transforms: `translate`, `rotate`, `scale`, `matrix`, `skewX`, `skewY`
- `<defs>` and `<use>` (basic)

### Phase 2: Paint and Text

- `<linearGradient>`, `<radialGradient>` with `<stop>` elements
- `<text>` and `<tspan>`
- `fill-rule` (evenodd, nonzero)
- `stroke-dasharray`, `stroke-linecap`, `stroke-linejoin`
- `fill-opacity`, `stroke-opacity`

### Phase 3: Advanced

- `<clipPath>`, `<mask>`
- `<pattern>`
- Inline `<style>` element with CSS selectors
- `<marker>` for line endpoints
- `<filter>` effects (feGaussianBlur, feDropShadow)

### Phase 4: Animation

- SMIL: `<animate>`, `<animateTransform>`
- Embedded `<image>` with base64 data

## Public API

```typescript
// Create SpaceSVG with native mesh rendering
const svg = new SpaceSVG(this);
svg.loadSVG(`<svg viewBox="0 0 100 100">...</svg>`);
svg.flush();  // builds MeshBuilder geometry, assigns to RenderMeshVisual

// Programmatic manipulation
const tree = svg.parse(`<svg>...</svg>`);
tree.getElementById('myCircle').setAttribute('fill', 'blue');
svg.render(tree);
svg.flush();
```

## Error Handling

Two custom error classes, both extending `Error` with automatic stack traces:

| Error Class | When |
|---|---|
| `SpaceSVGParseError` | Malformed XML, unclosed tags, invalid attributes |
| `SpaceSVGRenderError` | Unsupported element, invalid path data, missing gradient ref |

All errors include context: element tag name, element id (if present), attribute being processed, position in SVG string. Errors are thrown and logged via `print()` for Lens Studio console.

## Demo Catalog (`SpaceSVGDemo.ts`)

The demo component (`demoIndex` input in Inspector) provides 21 visual demos covering all Phase 1 features plus MathJax/LaTeX rendering. Set `cycleInterval` > 0 to auto-cycle. Prev/Next navigation buttons are created automatically.

| Index | Name | Features Exercised |
|-------|------|--------------------|
| 0 | Basic Shapes | `<rect>`, `<circle>`, `<ellipse>`, rounded `<rect>`, fill colors |
| 1 | Polygon & Polyline | `<polygon>`, `<polyline>`, stroke rendering |
| 2 | Path Lines | `<path>` M/L/H/V/Z commands, absolute and relative |
| 3 | Path Curves | `<path>` C/S (cubic bezier) and Q/T (quadratic bezier) |
| 4 | Path Arcs | `<path>` A command (arc), large-arc and sweep flags |
| 5 | Transforms | `translate`, `rotate`, `scale`, `skewX` |
| 6 | Groups | `<g>` with inherited `fill`, `opacity`, and group `transform` |
| 7 | Defs & Use | `<defs>`, `<use>` with `href`, per-instance `fill` override |
| 8 | Stroke | Stroke on rect, circle, line, and curved path |
| 9 | Opacity | `opacity` and `fill-opacity` on overlapping shapes |
| 10 | Style Attribute | Inline `style="..."` overriding presentation attributes |
| 11 | Have a Nice Day Logo | Multi-element composition (face with eyes, mouth, body) |
| 12 | Fancy Text "SVG" | Bezier curve lettering, decorative accents, corner brackets |
| 13 | Block Text "HELLO" | Geometric block letters from colored rectangles with shadows |
| 14 | Analog Clock | **Animated** — real-time clock rebuilt every second, hour/minute/second hands, tick marks |
| 15 | Sinc Plot Chart | Data visualization — sinc(x) curve, grid lines, axes, tick marks |
| 16 | Heatmap | Generated 10x10 color grid with blue-to-red radial gradient, legend bar |
| 17 | Tiger Face | Complex illustration — 40+ elements: fur, stripes, eyes, nose, whiskers, ears |
| 18 | SVG Logo | Multi-path logo with masks and `<use>` references |
| 19 | SVG LATEX1 | MathJax summation formula — complex `<path>` glyphs via `<defs>`/`<use>`, Y-flip `matrix` transform |
| 20 | SVG LATEX2 | **Animated** — countdown from a=10 to a=0 with MathJax glyphs (see below) |

### SVG LATEX2: Animated Countdown Demo

This demo exercises dynamic SVG generation with MathJax font glyphs and native `Text` for UI.

**Display:**
- **Native `Text` component** (top): Instruction sentence — "Solve the expression for a when a equals N" where N is the current countdown value
- **SVG row 1** (white / green): The assertion `a ≠ 0` while a > 0, switches to `a = 0` in green when solved
- **SVG row 2** (grey): Current value `a = 10`, `a = 9`, ..., `a = 0`

**Implementation:**
- `buildLatexCountdownSVG(value)` dynamically generates the SVG each second
- MathJax glyph paths for digits 0–9, italic 'a', '=', and '≠' are embedded in `<defs>`
- The instruction text uses a native Lens Studio `Text` component, NOT SVG text rendering (see "Text Rendering Strategy" below)
- Countdown resets to 10 when navigating back to this demo

### Setup

1. Add `SpaceSVGDemo` script to a SceneObject (e.g., inside a ContainerFrame)
2. Assign an unlit material to the `material` input
3. Set `demoIndex` (0–20) to select a demo
4. Optionally set `cycleInterval` (seconds) to auto-cycle through all demos
5. Set `worldWidth` / `worldHeight` to control output size (default: 20x20)

## SVG Conformance Testing (`SpaceSVGTestSuite.ts`)

Reference: [W3C SVG Test Suite](https://www.w3.org/Graphics/SVG/Test/20000608/toc.html)

Since there's no automated test runner in Lens Studio, `SpaceSVGTestSuite.ts` runs all tests at startup and logs results via `print()`.

### Test Categories

| Category | Tests | What It Covers |
|----------|-------|----------------|
| XML Parser | 13 | Tag parsing, attributes, self-closing, nesting, entities, comments, text content, getElementById, getElementsByTagName, clone independence, error cases (mismatched/unclosed tags), XML prolog |
| Color Parser | 7 | Hex (#RGB, #RRGGBB), named colors, rgb(), rgba(), none/transparent/empty |
| ViewBox | 3 | Space-separated, comma-separated, null/invalid input |
| Path Parser | 11 | M/L, implicit lineto, H/V, Z, C (cubic), Q (quadratic), A (arc), relative commands, compact notation, negative numbers, multiple M |
| Tessellator | 4 | Triangle path, multiple subpaths, cubic bezier tessellation, arc tessellation |
| Triangulator | 6 | Triangle, quad, pentagon, degenerate inputs (0/1/2 points), stroke triangulation |
| Style Resolver | 9 | Default values, attribute override, style attribute priority, inheritance, transform parsing (translate/scale/rotate), composed transforms |
| Integration | 9 | Rect→mesh, circle→mesh, path→mesh, group+transform, defs/use, stroke-only line, display:none exclusion, empty SVG, fill:none+stroke |
| Error Boundaries | 4 | Malformed XML, unclosed tag, mismatched tags, zero-size rect |

**Total: 66 assertions**

### Running Tests

Add `SpaceSVGTestSuite` script to any SceneObject. Tests run automatically on `onAwake()`. Check the Lens Studio console for output:

```
═══════════════════════════════════════
[SpaceSVG Test Suite] Running...
═══════════════════════════════════════
[TestSuite] XML Parser
[TestSuite] Color Parser
...
═══════════════════════════════════════
[SpaceSVG Test Suite] 66 passed, 0 failed
═══════════════════════════════════════
```

## Text Rendering Strategy

Text in SpaceSVG demos falls into two distinct categories that require different solutions.

### Problem

The LATEX2 countdown demo needs to display an instruction sentence ("Solve the expression for a when a equals N") alongside SVG math expressions. This is a text rendering problem — but the right solution depends on what the text IS.

### Options Evaluated

| Option | Approach | Verdict |
|--------|----------|---------|
| **Pixel font via SVG paths** | Render text as hundreds of tiny `<rect>` subpaths using an 8x8 bitmap font embedded in the SVG | Rejected. Adds ~60 lines of bitmap data, generates hundreds of mesh subpaths even with run-length optimization, poor visual quality vs native text. Wrong tool for UI text. |
| **MathJax glyph paths for all letters** | Source vector outline paths for every letter from the MathJax TeX font | Rejected. Requires hundreds of glyph path definitions, heavy maintenance, inflexible for general text. Only appropriate for math symbols. |
| **SVG `<text>` element support** | Implement full `<text>`/`<tspan>` rendering in SpaceSVG (Phase 2 feature) | Deferred. Correct long-term solution for text WITHIN SVGs, but requires font glyph loading, text layout, and path conversion. Overkill for a demo instruction label. |
| **Native `Text` component** | Use Lens Studio's built-in `Component.Text` for the instruction sentence | **Adopted.** Zero font handling code. Renders crisp at any size. Already used in the demo for nav labels. UI text belongs as a native component, not inside SVG. |
| **Font library (e.g., opentype.js)** | Import a JS font parsing library to convert TTF/OTF glyphs to SVG paths at runtime | Rejected for now. Heavy dependency, complex porting to Lens Studio runtime. Revisit if Phase 2 `<text>` needs high-fidelity font rendering. |

### Decision

**Use native `Text` components for UI/instructional text. Reserve SVG-based text rendering for Phase 2 `<text>` element support.**

The boundary is clear:
- **Native `Text`**: Labels, instructions, UI — anything that describes or annotates the SVG content
- **SVG text (Phase 2)**: Text that is part of the SVG document itself (e.g., axis labels in a chart SVG, text elements in an imported SVG file)
- **MathJax glyph paths**: Math symbols and expressions — already working via `<path>` definitions in `<defs>` with `<use>` references

## Implementation Notes

### MeshBuilder Patterns (from Spectacles Samples)

The native mesh approach follows patterns from official Snap Spectacles samples (Path Pioneer, Agentic Playground, RaycastPainter, Outdoor Navigation):

- Vertex layout: `position` (3 components) — color set via material, not vertex attribute
- Topology: `MeshTopology.Triangles`
- Index type: `MeshIndexType.UInt16`
- Vertex data via `appendVerticesInterleaved()` (flat float array)
- Validation via `builder.isValid()` before `updateMesh()`
- Per-instance color via `visual.mainPassOverrides.baseColor` (not `Material.clone()`)
- Scene objects created as children of the script's SceneObject

### Coordinate System

- SVG: Y-axis points down, origin at top-left
- Lens Studio: Y-axis points up
- Conversion: `wy = worldHeight/2 - (svgY - viewBoxMinY) * scale`
- Y-flip reverses triangle winding — indices are swapped to fix back-face culling

### Stroke Rendering

Strokes use direct quad triangulation (not ear-clipping) to handle closed paths correctly. Each path segment generates a quad (2 triangles) between left/right offset edges. Closed paths (first == last point) wrap the final quad back to the first vertex pair.

### Subpath Merging (Draw Call Optimization)

All subpaths within a single SVG element are merged into one mesh group for both fill and stroke. Previously, each subpath created a separate `RenderMeshVisual` scene object (one draw call each). Now a `<path>` with N subpaths produces 1 fill mesh group + 1 stroke mesh group instead of 2N.

This is critical for:
- **Complex glyphs**: Digit "8" has 3 subpaths (outer + 2 holes) → now 1 draw call instead of 3
- **Compound paths**: Any SVG path with multiple M...Z sequences
- **Future pixel/bitmap text**: If SVG-based text is ever needed, merged subpaths prevent draw call explosion

Implementation: vertices from all subpaths are concatenated into one array, with triangle indices offset by `baseVertex = mergedVerts.length / 3` for each successive subpath.

### Error Logging and Diagnostics

Parse errors and unhandled SVG directives are logged to help diagnose rendering failures:

| Situation | Log Level | Message |
|-----------|-----------|---------|
| `<use>` target not found | Error | `[SpaceSVG] Error: <use> target "#id" not found in document` |
| `<path>` missing `d` attribute | Warning | `[SpaceSVG] Warning: <path> element has no 'd' attribute` |
| Unknown SVG element | Warning | `[SpaceSVG] Warning: unhandled SVG element <tagName>` |
| Fill triangulation failure | Warning | `[SpaceSVG] Warning: fill triangulation failed for <tagName> (N points)` |

Tags are classified into three sets:
- **Container tags** (`svg`, `g`, `a`, `symbol`, `switch`): Process children, no own geometry — silent
- **Metadata tags** (`title`, `desc`, `metadata`): No visual output — silent
- **Everything else**: Logged as warning if not a known shape

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| MeshBuilder doesn't work on Spectacles | Entire approach blocked | Investigate SIK LineRenderer's MeshBuilder config; replicate working setup |
| SVG arc-to-bezier conversion bugs | Incorrect path rendering | Use well-tested reference algorithm |
| XML parser edge cases | Parse failures on valid SVGs | Extensive test cases, swap to jsdom later |
| Font availability on Spectacles | Text renders incorrectly | Default to sans-serif, document limitations |
| Triangulation bugs for complex paths | Visual artifacts | Use earcut algorithm, test with complex geometry |
| Large SVG performance | Slow parse/render | Limit element count, lazy rendering |
