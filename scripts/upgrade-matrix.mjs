// Applies each "security fix" upgrade to a throwaway copy of the project and
// runs the smoke test against it, so you can see which fixes break what.
//
//   node scripts/upgrade-matrix.mjs                 # all scenarios
//   node scripts/upgrade-matrix.mjs jquery-3.5.0    # just one (or several ids)
//
// The working copy is never modified. Results go to upgrade-matrix-report.md.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// overrides: undefined = keep as is, null = remove the follow-redirects override, object = replace
const SCENARIOS = [
  { id: 'baseline', pair: '-', install: [], expect: 'ok', note: 'Vulnerable versions as shipped.' },

  // axios -> follow-redirects (transitive) / axios <-> qs (paramsSerializer)
  { id: 'follow-redirects-1.16.0', pair: 'axios → follow-redirects', install: [], overrides: { 'follow-redirects': '1.16.0' }, expect: 'break',
    note: 'CVE-2022-0536 / GHSA-r4q5 fix: confidential headers are dropped when the redirect changes host:port.' },
  { id: 'axios-0.33.0', pair: 'axios ↔ qs, axios → follow-redirects', install: ['axios@0.33.0'], overrides: null, expect: 'break',
    note: 'Latest 0.x fix line. paramsSerializer is normalized to an object; pulls follow-redirects ^1.15.4.' },
  { id: 'axios-1.18.0', pair: 'axios ↔ qs, axios → follow-redirects', install: ['axios@1.18.0'], overrides: null, expect: 'break',
    note: 'Latest 1.x. Same paramsSerializer change; pulls follow-redirects ^1.16.0.' },
  { id: 'qs-6.5.3', pair: 'axios ↔ qs', install: ['qs@6.5.3'], expect: 'ok', note: 'Minimum fix for CVE-2022-24999 only (later qs CVEs remain).' },
  { id: 'qs-6.16.0', pair: 'axios ↔ qs', install: ['qs@6.16.0'], expect: 'break', note: 'CVE-2025-15284 fix: arrayLimit (20) now applies to a[]= bracket arrays.' },

  // moment-timezone -> moment
  { id: 'moment-2.29.4', pair: 'moment-timezone → moment', install: ['moment@2.29.4'], expect: 'ok', note: 'Fixes both moment CVEs; still deduped with moment-timezone.' },
  { id: 'moment-timezone-0.5.35', pair: 'moment-timezone → moment', install: ['moment-timezone@0.5.35'], expect: 'ok', note: 'Minimum fix; still accepts moment >=2.9.0.' },
  { id: 'moment-timezone-0.6.4', pair: 'moment-timezone → moment', install: ['moment-timezone@0.6.4'], expect: 'break',
    note: 'Requires moment ^2.29.4, so npm nests a 2nd moment; the app\'s moment@2.29.1 never gets .tz().' },
  { id: 'moment-timezone-0.6.4+moment-2.29.4', pair: 'moment-timezone → moment', install: ['moment-timezone@0.6.4', 'moment@2.29.4'], expect: 'ok',
    note: 'Upgrading both together keeps a single moment instance.' },

  // marked <-> dompurify
  { id: 'marked-4.0.10', pair: 'marked ↔ dompurify', install: ['marked@4.0.10'], expect: 'ok', note: 'Minimum fix for both marked ReDoS CVEs.' },
  { id: 'marked-18.0.14', pair: 'marked ↔ dompurify', install: ['marked@18.0.14'], expect: 'break', note: 'Latest: renderer methods now receive a token object.' },
  { id: 'dompurify-2.0.17', pair: 'marked ↔ dompurify', install: ['dompurify@2.0.17'], expect: 'ok', note: 'Minimum fix for CVE-2020-26870 only.' },
  { id: 'dompurify-3.4.16', pair: 'marked ↔ dompurify', install: ['dompurify@3.4.16'], expect: 'break',
    note: 'SAFE_FOR_XML (added with the CVE-2024-45801/47875 fixes) strips attribute values containing "-->".' },

  // bootstrap -> jquery
  { id: 'jquery-3.5.0', pair: 'bootstrap → jquery', install: ['jquery@3.5.0'], expect: 'break', note: 'CVE-2020-11022/11023 fix: htmlPrefilter no longer expands <tag/>.' },
  { id: 'jquery-4.0.0', pair: 'bootstrap → jquery', install: ['jquery@4.0.0'], expect: 'break', note: 'Latest major.' },
  { id: 'bootstrap-3.4.1', pair: 'bootstrap → jquery', install: ['bootstrap@3.4.1'], expect: 'break',
    note: 'CVE-2019-8331 fix: tooltip/popover HTML is sanitized against a whitelist (no <button>).' },
  { id: 'bootstrap-5.3.8', pair: 'bootstrap → jquery', install: ['bootstrap@5.3.8'], expect: 'break',
    note: 'CVE-2024-6485 has no 3.x fix; migrating to 5.x is the only way out.' },
];

const wanted = process.argv.slice(2);
const scenarios = wanted.length ? SCENARIOS.filter((s) => wanted.includes(s.id)) : SCENARIOS;
if (!scenarios.length) {
  console.error(`Unknown scenario. Available:\n  ${SCENARIOS.map((s) => s.id).join('\n  ')}`);
  process.exit(2);
}

const SKIP = new Set(['node_modules', 'dist', '.upgrade-matrix', 'smoke-screenshot.png', 'upgrade-matrix-report.md']);
const rows = [];

for (const s of scenarios) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `upgrade-${s.id}-`));
  process.stdout.write(`\n▶ ${s.id} ${s.install.length ? `(npm install ${s.install.join(' ')})` : ''}\n`);

  fs.cpSync(root, dir, { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) || path.dirname(src) !== root });
  fs.cpSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), { recursive: true });

  if (s.overrides !== undefined) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    if (s.overrides === null) delete pkg.overrides;
    else pkg.overrides = s.overrides;
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  }
  if (s.install.length || s.overrides !== undefined) {
    const npm = spawnSync(`npm install --no-audit --no-fund ${s.install.join(' ')}`, { cwd: dir, shell: true, encoding: 'utf8' });
    if (npm.status !== 0) {
      rows.push({ ...s, resolved: '-', passed: 0, total: 0, failures: [{ area: 'npm', check: 'install', detail: npm.stderr.split('\n').slice(-5).join(' ') }] });
      continue;
    }
  }
  const shown = new Set(s.install.map((spec) => spec.slice(0, spec.lastIndexOf('@'))));
  if (s.overrides !== undefined) shown.add('follow-redirects');
  const resolved = [...shown].map((n) => `${n}@${readVersion(dir, `node_modules/${n}`)}`);
  const nestedMoment = readVersion(dir, 'node_modules/moment-timezone/node_modules/moment');
  if (nestedMoment !== '?') resolved.push(`nested moment@${nestedMoment} under moment-timezone`);

  const report = path.join(dir, 'smoke.json');
  spawnSync(process.execPath, ['scripts/smoke-test.mjs', '--json', report], { cwd: dir, stdio: 'inherit' });
  const results = fs.existsSync(report) ? JSON.parse(fs.readFileSync(report, 'utf8')) : [];
  const failures = results.filter((r) => !r.ok);
  rows.push({ ...s, resolved: resolved.join(', ') || '-', passed: results.length - failures.length, total: results.length, failures });

  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore locked temp files on Windows */
  }
}

// ---------------------------------------------------------------------------
const lines = [
  '# Upgrade matrix',
  '',
  `Generated ${new Date().toISOString()} by \`npm run upgrade-matrix\`.`,
  '',
  '| Scenario | Pair | Resolved | Smoke | Expected | What broke |',
  '|---|---|---|---|---|---|',
  ...rows.map((r) => {
    const outcome = r.failures.length ? 'break' : 'ok';
    const flag = outcome === r.expect ? '' : ' ⚠️ unexpected';
    const broke = r.failures.map((f) => `**${f.area} › ${f.check}**: ${esc(f.detail).slice(0, 180)}`).join('<br>') || '—';
    return `| \`${r.id}\` | ${r.pair} | ${esc(r.resolved)} | ${r.passed}/${r.total} ${outcome === 'ok' ? '✅' : '❌'} | ${r.expect}${flag} | ${broke} |`;
  }),
  '',
  '## Notes',
  '',
  ...rows.map((r) => `- \`${r.id}\`: ${r.note}`),
  '',
];
// Only a full run rewrites the report, so a single-scenario run can't clobber it.
if (!wanted.length) fs.writeFileSync(path.join(root, 'upgrade-matrix-report.md'), lines.join('\n'));

console.log('\n==================== upgrade matrix ====================');
for (const r of rows) {
  const outcome = r.failures.length ? 'BREAK' : 'OK   ';
  console.log(`${outcome}  ${r.id.padEnd(38)} ${r.passed}/${r.total}${(r.failures.length ? 'break' : 'ok') === r.expect ? '' : '   <-- unexpected'}`);
  for (const f of r.failures) console.log(`         ↳ ${f.area} › ${f.check}: ${f.detail.split('\n')[0].slice(0, 140)}`);
}
if (!wanted.length) console.log('\nWrote upgrade-matrix-report.md');

function readVersion(dir, rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, rel, 'package.json'), 'utf8')).version;
  } catch {
    return '?';
  }
}

function esc(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
