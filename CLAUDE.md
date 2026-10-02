# TimeVault

Electron port of the 2008 Yahoo! Widget "Time Vault" (dev name YATT), aiming to
preserve the original skin, animations and floating transparent window exactly.

## Layout

```
Contents/     the original widget. FROZEN — never edit. The reference for
              side-by-side comparison, and the only runnable original.
PSD/          source art, the only path to re-exporting assets at 2x.
TimeVault.widget   the 2008 build, for comparing animation timing.
app/          the Electron port.
  src/shim/   Konfabulator compatibility layer (see below).
  src/widget/ ported copies of Contents/*.js.
  src/widgui/ ported copies of the WidGUI toolkit.
  assets/     copies of Contents/Resources. Copied, not referenced, so the
              original stays runnable alongside the port.
  tools/      build-time generators. Re-run after changing assets or the .kon.
  test/       headless Electron test suite.
```

## Running

```bash
cd app
npm start        # run the app
npm test         # headless test suite
```

**If Electron exits with `Cannot read properties of undefined (reading 'on')`,
your shell has `ELECTRON_RUN_AS_NODE=1` set** — VS Code's integrated terminal
exports it. Electron then runs as plain Node and every Electron API is
undefined. Prefix with `env -u ELECTRON_RUN_AS_NODE`.

Electron is pinned to an exact version so the postinstall resolves from the
local `~/Library/Caches/electron` rather than downloading from GitHub.

## The port's architecture

The original is ~10,700 lines of Konfabulator-flavoured JS: 8,200 in
`Contents/`, plus a 2,500-line UI toolkit (WidGUI) that `Main.js` loads at
runtime. Almost none of it was rewritten. Instead `app/src/shim/` reimplements
the Konfabulator runtime over the DOM, so the original layout and animation
code runs nearly unchanged.

Everything is loaded as classic scripts in `index.html`, in the order
`Main.js`'s `includeFile()` calls imply. Globals stay globals — deliberately,
since the original relies on them everywhere.

### Gotchas that cost real time

**Konfabulator's accessor syntax is invalid JS.** The original uses
`Foo.prototype.bar setter = function(v) {...}`. Nothing parses until it's
rewritten. `tools/fix-accessors.js` converts it to `Object.defineProperty`
(not ES6 get/set: the getter and setter are separate, often non-adjacent
statements, and `FrameWrapper.js` uses a computed name in a loop).
Redefining an existing accessor property *merges* the descriptor, so split
declarations still produce one working pair.

**Image dimensions must be synchronous.** Konfabulator loaded images from the
bundle and reported a size the instant `src` was set. The DOM reports 0 until
the image decodes, and the original can't wait — `ThreePiecesRectangle` reads
`imageLeft.width` in its constructor. Without this the 3-piece backgrounds
collapse to zero offsets. `tools/gen-image-sizes.js` reads PNG IHDR headers
into a lookup table at build time.

**Images must scale each axis independently.** The 3-piece backgrounds set
only the width of a 1px-wide slice and expect the height to stay put. An
`<img>` with one CSS dimension preserves its aspect ratio, making those slices
thousands of pixels tall. The shim pins the other axis to its natural size.

**Opacity is 0–255, not 0–1.** Converted in the shim's setter so ported code
keeps the original scale on both read and write.

**`visible` maps to `visibility`, not `display`.** Hidden elements must keep
their place in the layout.

**Preference values are always strings**, including checkboxes (`"0"`/`"1"`)
and numbers. The ported code string-compares them. `"setme"` is the original's
"never saved" sentinel and must pass through unresolved.

**Konfabulator's XML API is not the W3C DOM.** Collections use `.item(i)`,
nodes use `.evaluate(path)`, and `childNodes` excludes whitespace text nodes —
WidGUI's skin parser iterates children assuming every one is a style element.

**`new URL()` collides with the DOM.** Konfabulator's async fetch object is
shimmed as `KonURL`; the single call site in `Main.js` was changed to match.
This is one of the very few edits to ported code.

**Script order differs from the original.** Konfabulator resolved
`includeFile()` on demand, so order didn't matter. Here `FrameWrapper.js` must
precede `RoundButton.js` and `FlashingButton.js`, and `includeFile` must exist
as a global before them even though `Main.js` defines its own version.

### Generated files

Re-run these after changing the inputs; don't hand-edit the output.

```bash
node tools/gen-image-sizes.js    # after changing app/assets
node tools/gen-prefs-schema.js   # after changing Contents/Time Vault.kon
```

## Testing

`npm test` boots a headless Electron renderer, loads the shim plus real ported
code, and asserts against both. It runs in a scratch `userData` directory —
without that it reads whatever a real run saved, which has already produced one
false failure.

`test/boot-check.js` loads the real `index.html` and reports the first error;
`test/layout-probe.js` dumps rendered geometry so layout can be checked
without a screenshot.

The fixture `test/fixtures/Events.db3` is the real database the widget wrote in
November 2007 (17 events, the schema of the day). The runner copies it before
use so the committed file stays pristine.

## Verifying visually

The transparent-window compositing and pixel alignment can't be checked from a
headless probe, and this environment can't screenshot. Run `npm start` and
compare against `TimeVault.widget` running in the original Yahoo! Widgets
engine — that side-by-side is the main thing keeping a pixel-exact port honest.
