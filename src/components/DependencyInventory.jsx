import pkg from '../../package.json';
import lock from '../../package-lock.json';
import Panel from './Panel.jsx';

// What each package is used for, and which other package it only works with.
const USAGE = {
  axios: { where: 'lib/api.js, scripts/sync-release-notes.mjs', linked: 'follow-redirects (transitive), qs (serializer)' },
  'follow-redirects': { where: 'axios in Node (release-notes sync)', linked: 'pulled in by axios; pinned via overrides', transitive: true },
  qs: { where: 'lib/api.js, UserDirectory share links', linked: 'axios paramsSerializer' },
  lodash: { where: 'UserDirectory, NotificationTemplates', linked: '—' },
  moment: { where: 'everywhere dates are shown', linked: 'patched by moment-timezone' },
  'moment-timezone': { where: 'main.jsx (global .tz), WorldClock, UserDirectory', linked: 'patches the shared moment instance' },
  marked: { where: 'lib/markdown.js (pipeline renderer)', linked: 'output must go through dompurify' },
  dompurify: { where: 'lib/markdown.js', linked: 'sanitizes marked output, keeps data-graph' },
  jquery: { where: 'legacy/jquery-global.js', linked: 'global + HTML parser used by bootstrap JS' },
  bootstrap: { where: 'main.jsx, LegacyWidgets', linked: 'needs window.jQuery; sanitizes popover HTML' },
  'crypto-js': { where: 'lib/vault.js', linked: '—' },
  'ua-parser-js': { where: 'DeviceBadge', linked: '—' },
  uuid: { where: 'api.js, vault.js, notes', linked: 'deprecated deep import uuid/v4' },
  react: { where: 'UI', linked: 'react-dom' },
  'react-dom': { where: 'main.jsx', linked: 'react' },
};

const resolved = (name) => lock.packages?.[`node_modules/${name}`]?.version ?? '?';

export default function DependencyInventory() {
  const names = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.overrides || {})].sort();
  return (
    <Panel title="Dependency inventory" packages={['package.json', 'package-lock.json']}>
      <table className="table table-condensed table-striped small inventory">
        <thead>
          <tr>
            <th>Package</th>
            <th>Version</th>
            <th>Used in</th>
            <th>Interlinked with</th>
          </tr>
        </thead>
        <tbody>
          {names.map((n) => (
            <tr key={n}>
              <td>
                <code>{n}</code> {USAGE[n]?.transitive && <span className="label label-info">transitive</span>}
              </td>
              <td>{resolved(n)}</td>
              <td>{USAGE[n]?.where}</td>
              <td>{USAGE[n]?.linked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
