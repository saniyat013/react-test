import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import uuidv4 from 'uuid/v4';
import Panel from './Panel.jsx';
import { renderMarkdown } from '../lib/markdown.js';
import { fetchReleaseNotes } from '../lib/api.js';

const SAMPLE = `### Release checklist
- [x] Bump **axios**
- [ ] Rotate API keys
- [ ] Run \`npm run smoke\`

\`\`\`pipeline
plan --> patch --> smoke test --> ship
\`\`\`

> Sanitized by DOMPurify. Try adding <img src=x onerror=alert(1)>
`;

export default function MarkdownNotes() {
  const [draft, setDraft] = useState(SAMPLE);
  const [notes, setNotes] = useState([]);
  const [release, setRelease] = useState({ state: 'loading' });
  const html = useMemo(() => renderMarkdown(draft), [draft]);

  useEffect(() => {
    fetchReleaseNotes()
      .then((md) => setRelease({ state: 'ok', html: renderMarkdown(md) }))
      .catch((e) => setRelease({ state: 'error', message: e.message }));
  }, []);

  const save = () => {
    if (!draft.trim()) return;
    setNotes((n) => [{ id: uuidv4(), body: draft, at: moment() }, ...n]);
    setDraft('');
  };

  return (
    <Panel title="Markdown notes" packages={['marked', 'dompurify', 'axios', 'uuid', 'moment']}>
      <div className="row">
        <div className="col-sm-6">
          <textarea className="form-control notes-editor" rows={11} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={save}>
            <span className="glyphicon glyphicon-floppy-disk" /> Save note
          </button>
        </div>
        <div className="col-sm-6">
          <div className="notes-preview" data-testid="notes-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      {notes.map((n) => (
        <div key={n.id} className="saved-note">
          <small className="text-muted">
            {n.id.slice(0, 8)} · {n.at.fromNow()}
          </small>
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(n.body) }} />
        </div>
      ))}
      <hr />
      <h5 className="team-heading">
        <span className="glyphicon glyphicon-bullhorn" /> Latest release notes <small>(synced by scripts/sync-release-notes.mjs)</small>
      </h5>
      {release.state === 'loading' && <p className="text-muted small">Loading…</p>}
      {release.state === 'error' && <div className="alert alert-warning small">Release notes unavailable: {release.message}</div>}
      {release.state === 'ok' && <div className="release-notes" data-testid="release-notes" dangerouslySetInnerHTML={{ __html: release.html }} />}
    </Panel>
  );
}
