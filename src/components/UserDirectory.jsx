import { useEffect, useMemo, useRef, useState } from 'react';
import _ from 'lodash';
import moment from 'moment';
import qs from 'qs';
import Panel from './Panel.jsx';
import { fetchUsers, getLastRequest } from '../lib/api.js';

const ROLE_LABEL = { admin: 'danger', developer: 'primary', viewer: 'default' };

// Bulk selection lives in the URL so it can be shared: ?selected[]=1&selected[]=2…
// The same qs dialect (arrayFormat: brackets) is used for the axios params.
function readSelectionFromUrl() {
  const { selected = [] } = qs.parse(window.location.search, { ignoreQueryPrefix: true });
  return new Set(selected.map(Number));
}

function shareLinkFor(ids) {
  const query = qs.stringify({ selected: [...ids].sort((a, b) => a - b) }, { arrayFormat: 'brackets', encode: false });
  return `${window.location.origin}${window.location.pathname}?${query}`;
}

export default function UserDirectory() {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [groupByTeam, setGroupByTeam] = useState(true);
  const [selected, setSelected] = useState(readSelectionFromUrl);
  const [error, setError] = useState(null);
  const [lastReq, setLastReq] = useState(null);

  // lodash debounce keeps request volume down while typing.
  const debounced = useRef(_.debounce((v) => setQuery(v), 300)).current;
  useEffect(() => () => debounced.cancel(), [debounced]);

  useEffect(() => {
    // _.trim on user input is the code path affected by CVE-2020-28500 (ReDoS).
    fetchUsers({ role, search: _.trim(query) })
      .then((list) => {
        setUsers(list);
        setError(null);
        setLastReq(getLastRequest('/users.json'));
      })
      .catch((e) => setError(e.message));
  }, [role, query]);

  useEffect(() => {
    if (selected.size) window.history.replaceState(null, '', shareLinkFor(selected));
  }, [selected]);

  const sorted = useMemo(() => {
    const byJoined = sortBy === 'joined';
    return _.orderBy(users, [byJoined ? (u) => moment(u.joined).valueOf() : sortBy], [byJoined ? 'desc' : 'asc']);
  }, [users, sortBy]);

  const groups = groupByTeam ? _.groupBy(sorted, 'team') : { All: sorted };
  const toggle = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allVisibleSelected = users.length > 0 && users.every((u) => selected.has(u.id));
  const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(users.map((u) => u.id)));

  return (
    <Panel
      title="User directory"
      packages={['axios', 'follow-redirects', 'qs', 'lodash', 'moment', 'moment-timezone', 'uuid']}
      footer={
        lastReq && (
          <>
            GET <code>{lastReq.url}</code> · X-Request-Id <code>{lastReq.id.slice(0, 8)}…</code>
          </>
        )
      }
    >
      <div className="row">
        <div className="col-sm-5 form-group">
          <input
            className="form-control input-sm"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              debounced(e.target.value);
            }}
          />
        </div>
        <div className="col-sm-3 form-group">
          <select className="form-control input-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="developer">Developer</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div className="col-sm-4 form-group">
          <select className="form-control input-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort: name</option>
            <option value="joined">Sort: newest</option>
            <option value="role">Sort: role</option>
          </select>
        </div>
      </div>
      <div className="directory-toolbar small">
        <label className="checkbox-inline">
          <input type="checkbox" checked={groupByTeam} onChange={(e) => setGroupByTeam(e.target.checked)} /> Group by team
        </label>
        <label className="checkbox-inline">
          <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} /> Select all
        </label>
        <span className="selection-count" data-testid="selection-count">
          {selected.size} selected
        </span>
        {selected.size > 0 && (
          <button className="btn btn-default btn-xs" onClick={() => navigator.clipboard?.writeText(shareLinkFor(selected))}>
            <span className="glyphicon glyphicon-link" /> Copy share link
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="directory-scroll">
        {_.map(groups, (members, team) => (
          <div key={team}>
            <h5 className="team-heading">
              {team} <span className="badge">{members.length}</span>
            </h5>
            <table className="table table-condensed table-hover">
              <tbody>
                {members.map((u) => (
                  <tr key={u.id} className={selected.has(u.id) ? 'info' : undefined} data-testid="user-row">
                    <td className="select-cell">
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                    </td>
                    <td>
                      <strong>{u.name}</strong>
                      <br />
                      <small className="text-muted">{u.email}</small>
                    </td>
                    <td>
                      <span className={`label label-${ROLE_LABEL[u.role]}`}>{u.role}</span>
                    </td>
                    <td className="small text-muted" title={u.tz}>
                      <span className="glyphicon glyphicon-time" /> {moment().tz(u.tz).format('HH:mm')}
                    </td>
                    <td className="text-right small text-muted" title={moment(u.joined).format('LLL')}>
                      joined {moment(u.joined).fromNow()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {users.length === 0 && !error && <p className="text-muted">No users match.</p>}
    </Panel>
  );
}
