import { useEffect, useState } from 'react';
// .tz() comes from the global `import 'moment-timezone'` in main.jsx, which patches
// the moment instance moment-timezone requires. npm dedupes both to moment@2.29.1.
import moment from 'moment';
// Vite resolves `moment` to its ESM build (dist/moment.js), so locales must come
// from dist/locale too, or they register on a different moment instance.
import 'moment/dist/locale/fr';
import 'moment/dist/locale/de';
import 'moment/dist/locale/ja';
import 'moment/dist/locale/bn';
import Panel from './Panel.jsx';

// Each locale import calls defineLocale(), which also makes it the global locale.
moment.locale('en');

const ZONES = ['UTC', 'Asia/Dhaka', 'Europe/Berlin', 'America/New_York', 'Asia/Tokyo'];
const LOCALES = { en: 'English', fr: 'Français', de: 'Deutsch', ja: '日本語', bn: 'বাংলা' };

export default function WorldClock() {
  const [now, setNow] = useState(() => moment());
  const [locale, setLocale] = useState('en');
  const [input, setInput] = useState('2026-10-01 14:30');
  const [baseZone, setBaseZone] = useState('Asia/Dhaka');

  useEffect(() => {
    const t = setInterval(() => setNow(moment()), 1000);
    return () => clearInterval(t);
  }, []);

  // moment.locale() with a user-controlled value is the pattern behind CVE-2022-24785.
  useEffect(() => {
    moment.locale(locale);
    setNow(moment());
  }, [locale]);

  // Free-form parsing: non-ISO input falls back to `new Date()` (moment logs a
  // deprecation warning), and long RFC2822-like strings hit the CVE-2022-31129 ReDoS.
  const parsed = moment.tz(input, baseZone);

  return (
    <Panel title="World clock & meeting planner" packages={['moment', 'moment-timezone']}>
      <div className="form-inline" style={{ marginBottom: 10 }}>
        <select className="form-control input-sm" value={locale} onChange={(e) => setLocale(e.target.value)}>
          {Object.entries(LOCALES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <ul className="list-group">
        {ZONES.map((z) => (
          <li key={z} className="list-group-item clock-row">
            <span>{z.replace('_', ' ')}</span>
            <span className="clock-time">{now.clone().tz(z).format('LTS')}</span>
            <small className="text-muted">{now.clone().tz(z).format('ddd, D MMM · [UTC]Z')}</small>
          </li>
        ))}
      </ul>

      <label className="small">Plan a meeting</label>
      <div className="row">
        <div className="col-xs-7">
          <input className="form-control input-sm" value={input} onChange={(e) => setInput(e.target.value)} />
        </div>
        <div className="col-xs-5">
          <select className="form-control input-sm" value={baseZone} onChange={(e) => setBaseZone(e.target.value)}>
            {ZONES.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>
      {parsed.isValid() ? (
        <>
          <table className="table table-condensed small" style={{ marginTop: 8, marginBottom: 4 }}>
            <tbody>
              {ZONES.filter((z) => z !== baseZone).map((z) => (
                <tr key={z}>
                  <td>{z}</td>
                  <td className="text-right">{parsed.clone().tz(z).format('LLLL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small text-muted">That is {parsed.fromNow()}.</p>
        </>
      ) : (
        <p className="text-danger small" style={{ marginTop: 8 }}>Could not parse that date.</p>
      )}
    </Panel>
  );
}
