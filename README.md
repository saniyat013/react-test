# ops-console

> ⚠️ **Intentionally vulnerable.** This project pins outdated, vulnerable, and deprecated npm packages on purpose. Do not deploy it or reuse its code.

A one-screen React 18 + Vite "Ops Console". Every vulnerable package is **really imported and used**, and the app works with those versions. Several packages are **interlinked**: upgrading one to clear its CVEs breaks the code that relies on the other. The [upgrade matrix](#upgrade-breakage-matrix) shows exactly how.

## Run it

```bash
npm install        # installs from package-lock.json; versions are pinned exactly
npm run dev        # http://localhost:5173  (predev syncs release notes first)
npm run build      # prebuild syncs release notes first
npm run smoke      # build + headless-browser check of every feature (needs Chrome or Edge)
npm run upgrade-matrix   # apply each security fix in a temp copy and smoke-test it
```

`smoke` and `upgrade-matrix` need Node 22+ (they use the built-in `WebSocket`) and a local Chrome or Edge (`CHROME_PATH` overrides detection).

`predev` / `prebuild` run [scripts/sync-release-notes.mjs](scripts/sync-release-notes.mjs), which downloads release notes with axios in Node. If that download fails, dev and build stop, which is intended.

## What's inside

| UI panel / script | Packages it uses |
|---|---|
| User directory | `axios` + `qs` (params, share links), `lodash`, `moment` + `moment-timezone` (local time), `uuid` |
| World clock & meeting planner | `moment` + `moment-timezone` (+ locales) |
| Markdown notes + release notes | `marked` → `dompurify` (with `pipeline` diagram blocks), `axios`, `uuid`, `moment` |
| Secrets vault | `crypto-js` (PBKDF2 defaults + AES), `uuid` |
| Notification templates | `lodash` (`_.template`, `_.zipObjectDeep`, `_.merge`) |
| Legacy widgets | `bootstrap` 3 JS plugins on top of `jquery` (custom tooltip template, popovers, confirm popover, modal, loading button, `.html()` injection) |
| Navbar device badge | `ua-parser-js` |
| Dependency inventory | reads `package.json` / `package-lock.json` at build time |
| `scripts/sync-release-notes.mjs` | `axios` in Node → `follow-redirects`, against [mock-server/content-service.mjs](mock-server/content-service.mjs) |

Each panel is wrapped in an error boundary ([Guard.jsx](src/components/Guard.jsx)), so a broken dependency shows up as a red "*panel* crashed: *error*" box instead of a blank page.

## Interlinked dependencies

| A | B | Link | Where |
|---|---|---|---|
| `axios@0.21.1` | `follow-redirects@1.14.0` | **transitive**, pinned with `overrides`; used whenever axios runs in Node | [scripts/sync-release-notes.mjs](scripts/sync-release-notes.mjs) |
| `axios@0.21.1` | `qs@6.5.2` | axios delegates param serialization to qs; the request interceptor calls `config.paramsSerializer()` | [src/lib/api.js](src/lib/api.js) |
| `qs@6.5.2` | app URL state | `?selected[]=…` share links parsed with `qs.parse` | [src/components/UserDirectory.jsx](src/components/UserDirectory.jsx) |
| `moment-timezone@0.5.31` | `moment@2.29.1` | **dependency**: `import 'moment-timezone'` in main.jsx patches the one shared moment; components call `moment().tz()` | [src/main.jsx](src/main.jsx), [WorldClock.jsx](src/components/WorldClock.jsx) |
| `marked@4.0.9` | `dompurify@2.0.12` | marked renderer emits `<div class="pipeline" data-graph="a --> b">`; DOMPurify must keep it; the app hydrates it | [src/lib/markdown.js](src/lib/markdown.js) |
| `bootstrap@3.4.0` | `jquery@3.4.1` | **runtime global** + Bootstrap builds widgets through jQuery's HTML parser | [src/legacy/jquery-global.js](src/legacy/jquery-global.js), [LegacyWidgets.jsx](src/components/LegacyWidgets.jsx) |
| `vite@4.5.0` (dev) | `esbuild@0.18.20` | **transitive** dev dependency | build tooling |

## Upgrade breakage matrix

Produced by `npm run upgrade-matrix`. Each row installs the version the advisories list as fixed (or the latest) in a throwaway copy, then runs the 28-check smoke test. The full, current output is written to `upgrade-matrix-report.md`.

| Upgrade | Clears | Result | What breaks, and why |
|---|---|---|---|
| `follow-redirects` → 1.16.0 (override) | all follow-redirects advisories | ❌ | **Release-notes sync gets 401**, so `npm run dev/build` fail. The fix (CVE-2022-0536, GHSA-r4q5) drops `Authorization`/`Cookie` when a redirect changes *host:port*. 1.14.0 only compared hostnames, so `127.0.0.1:4010 → 127.0.0.1:4011` kept the token. |
| `axios` → 0.33.0 or 1.18.0 (override removed) | all axios advisories | ❌ | **Every API call fails** with `paramsSerializer is not a function`: newer axios normalizes the qs serializer function into `{ serialize }`, and our interceptor calls it directly. The upgrade also pulls follow-redirects ≥1.15.4, so the sync breaks as above. |
| `qs` → 6.5.3 | CVE-2022-24999 only | ✅ | Minimal patch is safe; the 2025/2026 qs CVEs remain. |
| `qs` → 6.16.0 | all qs CVEs | ❌ | **User directory crashes** on a 25-user share link (`selected.map is not a function`). The CVE-2025-15284 fix enforces `arrayLimit` (20) on `a[]=` arrays, so larger ones parse to an object. |
| `moment` → 2.29.4 | both moment CVEs | ✅ | Still one deduped moment. |
| `moment-timezone` → 0.5.35 | both moment-timezone advisories | ✅ | Minimum fix still accepts `moment >=2.9.0`. |
| `moment-timezone` → 0.6.4 alone | same | ❌ | **Directory + World clock crash** with `.tz is not a function`. From 0.5.41 it requires `moment ^2.29.4`; npm nests a second moment under moment-timezone and patches that one, not the app's 2.29.1. |
| `moment-timezone` 0.6.4 **+** `moment` 2.29.4 | all | ✅ | Upgrading the pair together is the fix. |
| `marked` → 4.0.10 | both marked CVEs | ✅ | Minimal patch is safe. |
| `marked` → 18.x (latest) | same | ❌ | Pipeline diagrams render as plain code: renderer methods now get a token object instead of `(code, infostring)`. |
| `dompurify` → 2.0.17 | CVE-2020-26870 only | ✅ | Minimal patch is safe; later DOMPurify advisories remain. |
| `dompurify` → 3.4.16 | all fixable DOMPurify CVEs | ❌ | **Pipeline diagrams vanish** ("graph data was lost during sanitizing"). `SAFE_FOR_XML`, on by default since the CVE-2024-45801/47875 fixes, strips attribute values containing `-->`, and marked's output puts `a --> b` in `data-graph`. |
| `jquery` → 3.5.0 | both jQuery CVEs | ❌ | **Tooltip layout breaks**: the fix stopped `htmlPrefilter` expanding `<div/>`, so Bootstrap's `$(template)` nests `.tooltip-inner` inside `.tooltip-arrow`. |
| `jquery` → 4.0.0 | same | ❌ | **Whole app fails to start**: Bootstrap 3 throws "requires jQuery … lower than version 4" at import. |
| `bootstrap` → 3.4.1 | CVE-2019-8331 | ❌ | **Confirm popover loses its buttons** (the new sanitizer whitelist has no `<button>`), and the tooltip template breaks too, because the sanitizer re-parses it with `DOMParser`. CVE-2024-6485 has no 3.x fix. |
| `bootstrap` → 5.3.8 | both Bootstrap CVEs | ❌ | `data-toggle` → `data-bs-toggle`, no `button('loading')`, no glyphicons/panels: tooltips, popovers, modal and loading button all stop working. |

### Try one by hand

```bash
npm install jquery@3.5.0 && npm run smoke      # see the FAIL line and its reason
npm install jquery@3.4.1                        # put it back
```

Or run a single matrix scenario: `node scripts/upgrade-matrix.mjs dompurify-3.4.16`. The scenario list is at the top of [scripts/upgrade-matrix.mjs](scripts/upgrade-matrix.mjs).

## Deprecated packages

npm prints deprecation warnings on install for `uuid@3.4.0` (used via the deprecated `uuid/v4` deep import), `jquery@3.4.1`, `bootstrap@3.4.0` (EOL), `crypto-js@4.1.1` (unmaintained), and `ua-parser-js@0.7.21`. `moment` is in maintenance mode, and it logs a deprecation warning at runtime when the meeting planner gets non-ISO input.

`react` / `react-dom` 18.2.0 have no known advisories. The smoke test and matrix runner use Node built-ins only (Chrome DevTools protocol over the global `WebSocket`), so they add no dependencies.
