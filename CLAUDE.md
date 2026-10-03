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

Every script clears `ELECTRON_RUN_AS_NODE` first, because VS Code's integrated
terminal exports it and Electron then runs as plain Node with every Electron
API undefined — the symptom is `Cannot read properties of undefined (reading
'on')`. Invoking `electron` directly rather than through npm needs
`env -u ELECTRON_RUN_AS_NODE` in front of it.

Electron is pinned to an exact version for reproducible builds. It's fine to
upgrade it and let the postinstall download — an earlier version of this note
said to pin to whatever was already in `~/Library/Caches/electron` to avoid
downloading, which is no longer a constraint.

Essentially everything here runs through `electron`, so if you are an agent
with a sandboxed shell, see the sandbox rule in the global `~/.claude/CLAUDE.md`
— `electron`, `electron-builder`, `sips` and packaged apps all need it
disabled, and the denials are silent enough to look like application bugs.

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

**Images must be decoded before any widget code runs.** Dimensions aren't
enough: `MainWindow.js` composites the info area, start button and round
buttons onto canvases *in its constructors*, using images it has just created.
An `<img>` that hasn't decoded draws nothing and raises no error, so every
canvas-composited part of the skin came out blank and the widget looked flat
and grey. `shim/preload-images.js` decodes the whole skin up front and
`shim/loader.js` loads the ported scripts only after that — which is why the
`<script>` tags aren't in `index.html`.

A trap inside that trap: the shim replaces the global `Image`, so the
preloader must use `NativeImage` (captured in `primitives.js` before the
shadowing). Using `new Image()` there builds a Konfabulator object with no
`onload`, and startup hangs with no output at all.

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

**The widget's SQL uses double-quoted string literals.** `EventDatabase.js`
writes `INSERT INTO Projects (Name) VALUES ("____default____")`. SQLite
accepted that in 2008 as a MySQL-compatibility misfeature; modern SQLite reads
a double-quoted token as an *identifier* and rejects it. `node:sqlite` is
opened with `enableDoubleQuotedStringLiterals: true` to preserve the original
behaviour. Without it, schema creation dies partway — the `Events` table is
never created — and silently, because `Database.js` swallows SQL errors.

**`form()` and `alert()` are synchronous and must stay that way.** The ported
code reads `results[0]` immediately after `form()` returns, and `alert()`
returns the index of the button pressed. Both are implemented as modal windows
in the main process answered over `ipcRenderer.sendSync`: the renderer blocks
while the main process keeps running, which is the freeze Konfabulator had.
`event.returnValue` can be assigned asynchronously — verified.

**`widget.extractFile` must return a copy.** Konfabulator unpacked a resource
out of the compressed bundle to a temp path, and callers treat the result as
disposable — `Localization.js` deletes it right after reading. Returning the
real asset path therefore *deleted the shipped strings files* on every run.
`filesystem.remove` also refuses anything under `assets/` as a backstop.

**`widget.locale` must be a bare language code.** The resource folders are
`en`/`fr`/`tr`; `navigator.language` is `fr-FR` and never matches.

**Konfabulator supplied dragging, click-through and window sizing**, so the
widget implements none of them — see `shim/interaction.js`. Three traps there:
dragging must test only the element under the cursor (walking ancestors marks
everything interactive, because controls sit inside frames that have their own
handlers); click-through has to sample image alpha, since a transparent pixel
still hit-tests; and window fitting must measure in the stage's own coordinate
space, or the offset that uncovers content above the origin cancels itself out
and oscillates forever.

**Dragging must sample alpha too, not just click-through.** The OS window is a
rectangle fitted to the widget's bounding box, so it covers the transparent
regions the rounded corners and the gap beside the capsule leave behind — and
those dragged the window, which feels like grabbing it out of thin air. The
press is tested against `e.target`, not by re-hit-testing `clientX/clientY`:
the two disagree for a synthesised event, whose coordinates default to `0,0`,
and dispatching straight at an element is how the drag is driven from a test.
Testing the coordinates instead makes every drag test fail while the real
widget still works.

**`visible` must clip as well as hide.** CSS `visibility` is inherited but a
descendant can set it back to `visible`, which Konfabulator never allowed —
the drawer's dropdown kept painting below the collapsed widget. Hidden
elements keep their box, because layout code reads offsets off them.

**`alert()` returns a 1-based button index.** Konfabulator numbered from 1 and
the widget depends on it — `if (answer == 2) return;` is how Delete All
cancels. Returning Electron's 0-based index made "No" read as 1 and deleted
everything anyway.

**Context menus are two-sided.** `onContextMenu` fills in `contextMenuItems`
and the engine shows that menu once the handler returns. Storing the array
without showing it leaves right-click dead everywhere.

**`orderAbove(null)` means "bring to front".** WidGUI uses it to lift a
button's label above the background it just drew; ignoring a null sibling
leaves every label painted underneath its own artwork.

**Text must measure off-document, and an empty string still has a line
height.** The ported layout runs during construction, before anything is in
the document, and `MainDrawer` advances its row cursor by each label's
height — including the usually-empty Description column.

**A frame sized on one axis takes the other from its content.** WidGUI sets a
width and lets the height follow; absolutely positioned children give no
intrinsic height, so the box collapses and the control vanishes.

**`vScrollBar` on a frame scrolls its contents.** The drawer attaches one to
both lists; without it a long list just runs off the bottom.

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

## Packaging

`npm run dist` builds installers; CI does it on a `v*` tag — see
`.github/workflows/release.yml`.

**The electron-builder config lives in `app/electron-builder.yml`, not in
package.json.** With the config in a `build` block, electron-builder rewrites
`package.json` *in the working copy*, stripping `scripts`, `devDependencies`
and the `build` block itself. Every subsequent build then packages a more
degraded app, and the symptom is a packaged binary that exits 0 immediately
with no window and nothing on stdout — which looks like a startup crash and
sends you hunting in the wrong place entirely.

**Packaged apps can't be launched from the agent's shell.** A packaged
Electron app started from there exits 0 immediately with `main.js` never
executing — verified by injecting a file-write at the top of the packaged
copy. Not specific to this project: a three-line vanilla electron-builder app
fails identically. Don't debug the app over it; ask for it to be launched from
Finder. See the sandbox rule under Running.

**A packaged macOS app writes nothing to stdout.** `console.log` from the main
process is invisible when launched via `open`, and near-invisible when the
binary is run directly. Don't conclude from silence that code didn't run.

**`app.whenReady().then()` needs a `.catch()`.** Without it a startup failure
is an unhandled rejection: exit code 0, no window, no output.

The app icon is generated by `tools/gen-app-icon.js`, which upscales the 2008
128x128 artwork to the 512x512 electron-builder requires for macOS. It's soft;
there is no larger original, the PSDs top out at 128 too.

## Testing

`npm test` boots a headless Electron renderer, loads the shim plus real ported
code, and asserts against both. It runs in a scratch `userData` directory —
without that it reads whatever a real run saved, which has already produced one
false failure.

`test/boot-check.js` loads the real `index.html` and reports the first error;
`test/layout-probe.js` dumps rendered geometry so layout can be checked
without a screenshot.

**Always on top needs a window level, not just the flag.** On macOS plain
`setAlwaysOnTop(true)` uses the `'floating'` level, which keeps the window
above its own app's windows but *below* another application's active window —
so the widget kept vanishing behind whatever was in front, which reads as the
feature being broken. `window-host.js` uses `'screen-saver'`. Note that
`isAlwaysOnTop()` returns true either way, so it can't be the assertion; the
test reads back the Spaces pinning instead. All three callers (renderer, tray,
the Joplin auth flow restoring it) go through the one helper, or whichever
forgets the level silently downgrades it.

**The Joplin port ranges are matched, not merely preferred.** 41184 for a
packaged build, 27583 for `npm start` (`app.isPackaged`). There is no fallback
between them on purpose: a dev build reaching the release app writes into real
notes and authorises against a window you aren't watching. `connect()` also
discards a *stored* port outside the current range, or a token saved before
this rule would pin a dev build to the release app forever. Note that
`productName` in package.json *is* honoured for an unpackaged app launched as
`electron .` — userData is `TimeVault`, not `Electron`. A standalone
`electron some-script.js` gets `Electron`, which is why probe scripts appear to
use a different profile than the app.

**Joplin keeps only the newest auth token.** `POST /auth` replaces it, so a
second request invalidates the first: `/auth/check` then answers
`{"error":"...Invalid auth token..."}` rather than a status, and a wait on the
stale token collapses in about two milliseconds. Two sync triggers arriving
together was enough. `joplin-host.js` serialises authorisation through one
in-flight promise, and `waitForAuth` treats that error — and a timeout — as a
quiet `null` rather than a throw. Both used to surface as a failure dialog
about a second after the attempt started, while Joplin's real prompt was still
sitting there unanswered.

**Joplin's authorisation prompt is rendered inside the Joplin window**, not as
a native alert — see `packages/app-desktop/gui/Root.tsx` in the Joplin source.
So an always-on-top widget, or any modal of our own, hides the thing the user
is being told to go and click. The sync drops always-on-top while it waits.

**`tvHost` cannot be spied on.** `contextBridge.exposeInMainWorld` freezes the
object it exposes, so `tvHost.someCall = fn` fails *silently* in the renderer —
non-strict assignment to a frozen property is a no-op, not a throw. A test
written that way asserts on a counter nothing ever increments and passes or
fails for unrelated reasons. Expose a counter from the shim instead, as
`shim/joplin.js` does with `KON_JOPLIN_SYNC_COUNT`.

**A probe that boots `index.html` must register the IPC handlers.** The
renderer calls `ipcRenderer.sendSync` for preferences and the app version
during startup; with no listener those block forever and the probe hangs with
no output at all. Use `test/run-app-tests.js` as the template rather than a
fresh `BrowserWindow` — it registers `host`, `sql-host` and `window-host` and
auto-answers the modals.

The fixture `test/fixtures/Events.db3` is the real database the widget wrote in
November 2007 (17 events, the schema of the day). The runner copies it before
use so the committed file stays pristine.

## Verifying visually

The transparent-window compositing and pixel alignment can't be checked from a
headless probe, and this environment can't screenshot. Run `npm start` and
compare against `TimeVault.widget` running in the original Yahoo! Widgets
engine — that side-by-side is the main thing keeping a pixel-exact port honest.
