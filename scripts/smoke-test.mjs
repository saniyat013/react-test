// End-to-end smoke test for every feature that depends on an interlinked package.
//
//   node scripts/smoke-test.mjs [--json report.json]
//
// 1. runs the release-notes sync (Node: axios -> follow-redirects)
// 2. builds the app with Vite and serves it with `vite preview`
// 3. drives headless Chrome/Edge over the DevTools protocol (no extra npm deps)
//    and exercises each panel the way a user would
//
// Exit code 1 if any check fails. Set CHROME_PATH to use a specific browser.
import { spawn, spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const results = [];
const record = (area, check, ok, detail = '') => results.push({ area, check, ok: !!ok, detail: String(detail ?? '').trim() });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// 1. Release-notes sync (Node side of axios + follow-redirects)
// ---------------------------------------------------------------------------
fs.rmSync(path.join(root, 'public/mock/release-notes.md'), { force: true });
const sync = spawnSync(process.execPath, ['scripts/sync-release-notes.mjs'], { cwd: root, encoding: 'utf8' });
record('Release notes sync', 'download through authenticated redirect (:4010 -> :4011)', sync.status === 0, `${sync.stdout}${sync.stderr}`);

// ---------------------------------------------------------------------------
// 2. Build + preview
// ---------------------------------------------------------------------------
const { build, preview } = await import('vite');
try {
  await build({ root, logLevel: 'error' });
  record('Build', 'vite build', true);
} catch (e) {
  record('Build', 'vite build', false, e.message);
  finish();
}
const server = await preview({ root, logLevel: 'error', preview: { port: 4180, strictPort: false } });
const baseUrl = server.resolvedUrls.local[0];

// ---------------------------------------------------------------------------
// 3. Browser
// ---------------------------------------------------------------------------
const browserPath = findBrowser();
if (!browserPath) {
  record('Browser', 'find Chrome/Edge (set CHROME_PATH)', false);
  await server.httpServer.close();
  finish();
}
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-chrome-'));
const chrome = spawn(
  browserPath,
  ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1400,2200', 'about:blank'],
  { stdio: 'ignore' },
);

try {
  const port = await waitForDevToolsPort(profile);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const cdp = await connect(page.webSocketDebuggerUrl);

  const runtimeErrors = [];
  cdp.on((msg) => {
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      runtimeErrors.push(d.exception?.description?.split('\n')[0] || d.text);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      runtimeErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').split('\n')[0]);
    }
  });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  // Headless windows never get OS focus; without this, focus-triggered widgets never open.
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });

  // A share link with 25 selected users: exercises qs.parse on a >20 element array.
  const share = Array.from({ length: 25 }, (_, i) => `selected[]=${i + 1}`).join('&');
  await cdp.send('Page.navigate', { url: `${baseUrl}?${share}` });
  await waitFor(cdp, `document.querySelectorAll('.demo-panel, .panel-crash').length >= 7`, 15000);
  await sleep(1500); // let mock fetches settle

  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression: `(${pageChecks.toString()})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) record('Smoke test', 'page checks ran', false, exceptionDetails.exception?.description);
  else result.value.forEach((r) => results.push(r));

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(path.join(root, 'smoke-screenshot.png'), Buffer.from(shot.data, 'base64'));

  const uniqueErrors = [...new Set(runtimeErrors)].filter((e) => !/favicon/i.test(e));
  record('Runtime', 'no uncaught errors / console.error', uniqueErrors.length === 0, uniqueErrors.slice(0, 6).join(' | '));
  cdp.close();
} catch (e) {
  record('Browser', 'drive headless browser', false, e.stack);
} finally {
  chrome.kill();
  await server.httpServer.close();
  await sleep(300);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {
    /* Chrome may still hold a lock on Windows */
  }
}
finish();

// ---------------------------------------------------------------------------
// Checks that run inside the page. Must be self-contained (serialized with toString).
// ---------------------------------------------------------------------------
async function pageChecks() {
  const out = [];
  const rec = (area, check, ok, detail = '') => out.push({ area, check, ok: !!ok, detail: String(detail ?? '') });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const setValue = (el, v) => {
    const proto = { SELECT: HTMLSelectElement, TEXTAREA: HTMLTextAreaElement }[el.tagName] || HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  const section = async (name, fn) => {
    const crashed = document.querySelector(`.panel-crash[data-panel="${name}"]`);
    if (crashed) return rec(name, 'panel renders', false, text(crashed.querySelector('code')));
    const panel = $$('.demo-panel').find((p) => text(p.querySelector('.panel-title')).startsWith(name));
    if (!panel) return rec(name, 'panel renders', false, 'panel not found');
    try {
      await fn(panel);
    } catch (e) {
      rec(name, 'checks completed', false, e.message);
    }
  };

  await section('User directory', async (p) => {
    const rows = () => $$('[data-testid="user-row"]', p);
    const alert = text(p.querySelector('.alert-danger'));
    rec('User directory', 'loads 30 users (axios + qs paramsSerializer)', rows().length === 30, alert || `${rows().length} rows`);
    const footer = text(p.querySelector('.panel-footer'));
    rec('User directory', 'request URL serialized by qs', /users\.json\?.*fields\[\]=name/.test(footer), footer || 'no request recorded');
    const count = text(p.querySelector('[data-testid="selection-count"]'));
    rec('User directory', 'share link restores 25 selected users (qs.parse)', count === '25 selected', count);
    const tzCell = rows()[0]?.children[3];
    rec('User directory', "teammate local time (moment().tz)", /\d\d:\d\d/.test(text(tzCell)), text(tzCell));
    setValue(p.querySelector('select'), 'admin');
    await sleep(500);
    const roles = rows().map((r) => text(r.querySelector('.label')));
    const footer2 = text(p.querySelector('.panel-footer'));
    rec('User directory', 'role filter -> filter[role]=admin', roles.length > 0 && roles.every((r) => r === 'admin') && footer2.includes('filter[role]=admin'), footer2);
    setValue(p.querySelector('select'), '');
  });

  await section('World clock', async (p) => {
    const rows = $$('.clock-row', p);
    rec('World clock', '5 zones ticking (moment-timezone)', rows.length === 5 && rows.every((r) => /\d:\d\d:\d\d/.test(text(r))), text(rows[0]));
    const planner = $$('table tr', p);
    rec('World clock', 'meeting planner converts across zones', planner.length === 4 && planner.every((r) => text(r).includes('2026')), text(p.querySelector('.text-danger')) || `${planner.length} rows`);
    const locale = p.querySelector('select');
    setValue(locale, 'fr');
    await sleep(400);
    const day = text(p.querySelector('.clock-row small'));
    rec('World clock', 'locale switch to French (moment/locale/fr)', /\b(lun|mar|mer|jeu|ven|sam|dim)\./.test(day), day);
    setValue(locale, 'en');
    await sleep(200);
  });

  await section('Markdown notes', async (p) => {
    const preview = p.querySelector('[data-testid="notes-preview"]');
    rec('Markdown notes', 'marked renders headings + task list', text(preview.querySelector('h3')) === 'Release checklist' && $$('input[type=checkbox]', preview).length === 3, preview.innerHTML.slice(0, 120));
    rec('Markdown notes', 'DOMPurify strips onerror', !preview.querySelector('[onerror]'));
    const steps = $$('.pipeline-step', preview).map(text);
    rec('Markdown notes', 'pipeline block -> diagram (marked renderer + DOMPurify)', steps.length === 4, text(preview.querySelector('.pipeline-missing')) || (steps.join(' → ') || text(preview.querySelector('pre'))));
    const notes = p.querySelector('[data-testid="release-notes"]');
    rec('Markdown notes', 'synced release notes load', !!notes, text(p.querySelector('.alert-warning')));
    if (notes) {
      const rs = $$('.pipeline-step', notes);
      rec('Markdown notes', 'release-notes pipeline diagram', rs.length === 5, text(notes.querySelector('.pipeline-missing')) || `${rs.length} steps`);
    }
  });

  await section('Secrets vault', async (p) => {
    const secret = p.querySelector('input[placeholder="Secret value"]');
    setValue(secret, 'SMOKE_SECRET=42');
    await sleep(50);
    $$('button', p).find((b) => text(b).includes('Encrypt')).click();
    await sleep(200);
    const decrypt = $$('button', p).find((b) => text(b) === 'decrypt');
    decrypt?.click();
    await sleep(200);
    rec('Secrets vault', 'AES encrypt/decrypt round-trip (crypto-js)', text(p.querySelector('.text-success')) === 'SMOKE_SECRET=42', text(p.querySelector('.alert-warning')));
  });

  await section('Notification templates', async (p) => {
    const preview = text(p.querySelector('.well'));
    rec('Notification templates', 'lodash _.template renders (English calendar text)', preview.startsWith('Hi Rahim, you have 3 new alerts since Yesterday'), preview || text(p.querySelector('.alert-danger')));
    rec('Notification templates', '_.zipObjectDeep + _.merge prefs', text(p.querySelector('.prefs-json')).includes('"frequency": "weekly"'));
  });

  await section('Legacy widgets', async (p) => {
    const $ = window.jQuery;
    rec('Legacy widgets', 'announcement injected via $.html()', text(p.querySelector('.alert')).includes('billing service'), text(p.querySelector('.alert')));

    const tipBtn = p.querySelector('[data-testid="tooltip-btn"]');
    tipBtn.focus();
    await sleep(400);
    const tip = document.querySelector('.tooltip.ops-tooltip');
    const inner = tip?.querySelector('.tooltip-inner');
    const intact = inner && inner.parentElement === tip && text(inner) === 'Rendered by $.fn.tooltip';
    rec(
      'Legacy widgets',
      'tooltip with custom template (Bootstrap -> jQuery parser)',
      intact,
      !tip ? 'no tooltip rendered' : inner?.parentElement?.classList.contains('tooltip-arrow') ? 'tooltip-inner ended up INSIDE tooltip-arrow: self-closing <div/> no longer expanded' : tip.outerHTML.slice(0, 160),
    );
    tipBtn.blur();

    const popBtn = p.querySelector('[data-testid="popover-btn"]');
    popBtn.focus();
    await sleep(400);
    const pop = document.querySelector('.popover .popover-content');
    rec('Legacy widgets', 'popover with html content', pop?.querySelector('b'), pop ? pop.innerHTML : 'no popover rendered');
    popBtn.blur();
    await sleep(300);

    p.querySelector('[data-testid="ack-btn"]').click();
    await sleep(400);
    const actions = $$('.popover [data-action]');
    const content = document.querySelector('.popover .popover-content');
    rec('Legacy widgets', 'confirm popover shows action buttons', actions.length === 2, content ? `popover content: ${content.innerHTML}` : 'no popover rendered');
    actions.find((b) => b.dataset.action === 'ack')?.click();
    await sleep(400);
    rec('Legacy widgets', 'acknowledge via popover button', !!p.querySelector('[data-testid="ack-state"]'));

    p.querySelector('[data-testid="modal-btn"]').click();
    await sleep(600);
    const modal = document.getElementById('legacyModal');
    rec('Legacy widgets', 'modal opens via data-API', modal.classList.contains('in') || modal.classList.contains('show'), modal.className);
    if ($ && $.fn.modal) $(modal).modal('hide');
    await sleep(500);

    const save = p.querySelector('[data-testid="save-btn"]');
    save.click();
    await sleep(80);
    rec('Legacy widgets', "button('loading') state", text(save) === 'Saving…', text(save));
  });

  const badge = text(document.querySelector('.device-badge'));
  rec('Device badge', 'ua-parser-js detects browser', /Chrome|Edge/.test(badge), badge);

  await section('Dependency inventory', async (p) => {
    rec('Dependency inventory', 'reads package-lock.json', $$('tbody tr', p).length >= 14);
  });

  return out;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function finish() {
  const failed = results.filter((r) => !r.ok);
  const width = Math.max(...results.map((r) => `${r.area} › ${r.check}`.length));
  console.log('');
  for (const r of results) {
    const line = `${r.ok ? 'PASS' : 'FAIL'}  ${`${r.area} › ${r.check}`.padEnd(width)}`;
    console.log(r.ok ? line : `${line}\n        ↳ ${r.detail || '(no detail)'}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
}

function pathToImport(p) {
  return new URL(`file:///${p.replace(/\\/g, '/').replace(/^\//, '')}`).href;
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean);
  const found = candidates.find((c) => fs.existsSync(c));
  if (found) return found;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try {
      return execSync(`command -v ${bin}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      /* not installed */
    }
  }
  return null;
}

async function waitForDevToolsPort(dir) {
  const file = path.join(dir, 'DevToolsActivePort');
  for (let i = 0; i < 100; i++) {
    try {
      const port = fs.readFileSync(file, 'utf8').split('\n')[0].trim();
      if (port) return port;
    } catch {
      /* not written yet, or still locked by the browser (Windows) */
    }
    await sleep(100);
  }
  throw new Error('browser did not expose a DevTools port');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = [];
    let seq = 0;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else listeners.forEach((l) => l(msg));
    };
    ws.onerror = () => reject(new Error('DevTools websocket error'));
    ws.onopen = () =>
      resolve({
        send: (method, params = {}) =>
          new Promise((res, rej) => {
            const id = ++seq;
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          }),
        on: (fn) => listeners.push(fn),
        close: () => ws.close(),
      });
  });
}

async function waitFor(cdp, expression, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const { result } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.value) return;
    await sleep(200);
  }
}
