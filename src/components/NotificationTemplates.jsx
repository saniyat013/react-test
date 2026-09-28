import { useMemo, useState } from 'react';
import _ from 'lodash';
import moment from 'moment';
import Panel from './Panel.jsx';

const DEFAULT_PREFS = {
  channels: { email: true, sms: false, slack: false },
  digest: { frequency: 'daily' },
};

const FIELDS = [
  { path: 'channels.email', label: 'Email' },
  { path: 'channels.sms', label: 'SMS' },
  { path: 'channels.slack', label: 'Slack' },
];

export default function NotificationTemplates() {
  const [tpl, setTpl] = useState('Hi <%= name %>, you have <%= count %> new <%= count === 1 ? "alert" : "alerts" %> since <%= since %>.');
  const [name, setName] = useState('Rahim');
  const [count, setCount] = useState(3);
  const [values, setValues] = useState({ 'channels.email': true, 'channels.sms': false, 'channels.slack': true, 'digest.frequency': 'weekly' });

  // _.template compiles user-editable strings into functions: CVE-2021-23337 territory.
  const preview = useMemo(() => {
    try {
      return { text: _.template(tpl)({ name, count: _.toNumber(count), since: moment().subtract(1, 'day').calendar() }) };
    } catch (e) {
      return { error: e.message };
    }
  }, [tpl, name, count]);

  // Form paths -> nested object via _.zipObjectDeep (prototype pollution: CVE-2020-8203),
  // then deep-merged over defaults with _.merge.
  const prefs = useMemo(() => _.merge(_.cloneDeep(DEFAULT_PREFS), _.zipObjectDeep(_.keys(values), _.values(values))), [values]);

  const set = (path, v) => setValues((s) => ({ ...s, [path]: v }));

  return (
    <Panel title="Notification templates" packages={['lodash', 'moment']}>
      <div className="form-group">
        <label className="small">Template (lodash syntax)</label>
        <textarea className="form-control input-sm" rows={2} value={tpl} onChange={(e) => setTpl(e.target.value)} />
      </div>
      <div className="row">
        <div className="col-xs-7 form-group">
          <input className="form-control input-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="col-xs-5 form-group">
          <input className="form-control input-sm" type="number" min={0} value={count} onChange={(e) => setCount(e.target.value)} />
        </div>
      </div>
      {preview.error ? (
        <div className="alert alert-danger small">{preview.error}</div>
      ) : (
        <div className="well well-sm small">{preview.text}</div>
      )}

      <label className="small">Delivery preferences</label>
      <div>
        {FIELDS.map((f) => (
          <label key={f.path} className="checkbox-inline small">
            <input type="checkbox" checked={!!values[f.path]} onChange={(e) => set(f.path, e.target.checked)} /> {f.label}
          </label>
        ))}
        <select
          className="form-control input-sm inline-select"
          value={values['digest.frequency']}
          onChange={(e) => set('digest.frequency', e.target.value)}
        >
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
          <option value="never">No digest</option>
        </select>
      </div>
      <pre className="prefs-json">{JSON.stringify(prefs, null, 2)}</pre>
    </Panel>
  );
}
