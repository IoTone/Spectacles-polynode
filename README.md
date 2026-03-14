# Overview

Spectacles Polynode is a "polyfill" for missing libraries from Node.js and HTML5 browser ecosystems.  This is intended for portability when porting existing libraries and not a replacement for true spatial design.  That said, it is a good starting point for designing experiences to be used in AR if you only know HTML5/Canvas.  This project will contain libraries for use in your own projects, and will eventually migrate to being an asset if they are found to be useful.

These are the currently supported libraries:

- Spacecanvas
- SpaceSVG
- (future) Spacedom

![Image](https://github.com/user-attachments/assets/d5256b9a-dce3-4d49-9752-9877cfe56be6)

<img width="1067" height="558" alt="Image" src="https://github.com/user-attachments/assets/0135134e-760a-4f41-a18a-6da7baec2e82" />

## Build

At the moment the repo doesn't have a prefab created for the library, but you can just add the library to an existing project.  For a good example, see SpaceCanvasDemo.ts or SpaceCanvasGameOfLife.ts.  

### SpaceSVG Examples

There is a single library called SpaceSVG.ts, and a library called SpaceSVGDemo.  Just make sure to have the library in your assets, and move whatever demo or working code you have into the Scene.

Here is how to get started.

<img width="482" height="431" alt="Image" src="https://github.com/user-attachments/assets/46fc9f75-e6d5-4533-9528-dc5d9b8a7795" />


### Spacecanvas Examples

The general scheme to follow in your code is to import the libraries you need

```
import { SpaceCanvas } from './Spacecanvas';
import { WebView } from 'WebView.lspkg/WebView';
```

Add a WebView into your input to the script cpomonent:

```
@input
@hint('WebView component from WebView.lspkg, drag into the Scene')
webView!: WebView;
```

There are some error conditions to guard against:
```
    if (!this.webView) {
      print('[GameOfLife] ERROR: No webView assigned.');
      return;
    }
```

This is the boilerplate to set up the scene:

```
    const W = 1024;
    const H = 768;
    const CELL = 8;
    const COLS = Math.floor(W / CELL);
    const ROWS = Math.floor(H / CELL);

    const canvas = new SpaceCanvas(W, H, this.webView, this);
    const ctx = await canvas.getContext('2d');
    // Draw initial background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);
```

Now your rendering:

```
ctx.executeRaw('YOURJSCODEHERE');
ctx.flush();
```
The JS code used will be any sort of ctx calls.   See: https://www.w3schools.com/html/html5_canvas.asp When that's all set up, your actual ctx must be flushed. 

## Test

TODO - need to get a conformance test suite in to see what is missing in terms of the W3C spec for canvas.

## Demos

- SpaceCanvasSamples : a general set of samples of various HTML5 canvas type features
- SpaceCanvasGameOfLife: It's everyone's favorite Conway's Game Of Life
- SpaceCanvasNotDoom: It's not Doom.  But it aspires to show what a FPS can look like spatially.
- SpaceCanvasNokiSnakesDemo: It's not the old Nokia classic Snake game, but it is a very similar style and design, with controls and sound.
- SpaceSVGDemo: A full suite of 18 demos that show different styles of SVG.  The full catalog of samples is documented in the docs directory.
 
## Known Issues

- Heat!  :fire It will overheat your device quickly if you have a busy canvas
- compatibility: may not be 100% 1-1 with HTML5 Canvas
- Multiple canvases may not render simulatenously.   Not sure if this is a WebView issue that it only will run one at a time.
- The SpaceSVG code is a prototype level and not intended to be compliant with any level of SVG specification.  As such, all examples don't have the polish of their equivalent browser versions.  Fonts may be missing.  
- The SpaceSVG code needs a detailed explanation of what SVG compliance is availablee.

## Roadmap

- Add DOM api for porting compability: spacedom
- Improve SVG rendering support
- Overall power-consumption improvements for animations
- Add AI hooks to make it easy for AI to use the APIs at runtime to generate assets


## Attributions

JorgeP and I started on some of these ideas last summer.  We were working on a project to get LaTeX rendering working on spectacles.  This was supposed to be something we could do in TS/JS using existng libraries.  We figured out quickly that all of the libraries relied on output of PDF, SVG, HTML5, or png.  Since we don't have access to native code, generating a PNG would have required a bunch of retooling of the LaTeX parser.  Outputing PDF wasn't an option.  SVG seemed like it would be viable, but SVG rendering isn't supported natively in Lens Studio.  So we were stuck.  Yeah, we did not want to venture down a full rewrite of a library like MathJAX, something that took years to create.

I started to think the problem was not me, but the ecosystem.  All ecosystems assume DOM is available, event emitters, easy XML parsing, and the biggie, HTML5 Canvas.  This was the light that went off.  We need an HTML5 canvas exposed in Snap Spectacles as an API that is roughly compatible.  A lot of optimization has gone into the web stack.  Many devs understand HTML5 Canvas as a tool for animation or working outside of the principles of CSS layout.  So get canvas done first, and then unlock other things that we might need for compatibility.

90% of this code was built by a mix of Grok (I started with this prompt): I am building a spatial version of HTML5 canvas as a widget to use in Lens Studio for Snap Spectacles. Please propose an approach for designing an HTML5 canvas design that will work in 3D space and provde a performant best effort pollyfill/shim for canvas from html5. To avoid confusion with a similarly named classes, and lets call it spacecanvas. The code proposal should use Typescript and utilize Lens Scripting apis : https://developers.snap.com/lens-studio/api/lens-scripting/

Grok had a lot of issues with inventing apis that didn't exist, but conceptually, it came up with the core concept: use a WebView to get the HTML5 context without re-inventing that.  Then expose the API for canvas in a wrapper to the SpaceCanvas api.  Grok got a bit annoying in its inability to solve problems once stuck.  So in comes claude code to cleanup the existing code produced by Grok, which was just Spacecanvas.ts.  Claude produced a working design after we gave up trying to use a programatic WebView and switched to using one placed in the scene.

SVG work was 100% done in claude api with a cave human drooling over the keyboard and smashing like buttons on the terminal.  Initially the human tried just dragging SVGs into assets and realized with sadness this wasn't a supported file type.

Special thanks to the product team for dropping this little detail about how to inject data into the WebView : https://www.reddit.com/r/Spectacles/comments/1rjsa2x/comment/o8hzrrm/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button .  This gives us offline capability to render data from within a Spectacles Lens Script API.

The SVG inspiration was in looking at what a bunch of the HTML5 tooling had in common: SVG output is just nice because dumb machines understand XML and can pars and generate XML like O2/CO2.  Because SVG is compact and animates well, it is a natural choice in HTML5 output for things like charts, graphs, and simple visualizations.  But rather than try to ram this down onto the Spacecanvas, we thought it would be better to map it into Spatial and use Meshes to map to the shaps we need.  It's kludgy but someday we'll get this support natively or the Snap team will add something that takes the good ideas and makes them super efficient and asthetically pleasing.
