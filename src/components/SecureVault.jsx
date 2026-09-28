import { useState } from 'react';
import Panel from './Panel.jsx';
import { seal, unseal } from '../lib/vault.js';

export default function SecureVault() {
  const [passphrase, setPassphrase] = useState('correct horse battery staple');
  const [secret, setSecret] = useState('STRIPE_KEY=sk_test_1234567890');
  const [entries, setEntries] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [error, setError] = useState(null);

  const add = () => {
    if (!secret) return;
    setEntries((e) => [seal(passphrase, secret), ...e]);
    setSecret('');
  };

  const reveal = (entry) => {
    try {
      setRevealed((r) => ({ ...r, [entry.id]: unseal(passphrase, entry) }));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Panel
      title="Secrets vault"
      packages={['crypto-js', 'uuid']}
      footer="Key derivation: PBKDF2 with crypto-js defaults (SHA1, 1 iteration). See CVE-2023-46233."
    >
      <div className="form-group">
        <label className="small">Passphrase</label>
        <input className="form-control input-sm" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
      </div>
      <div className="input-group input-group-sm">
        <input className="form-control" placeholder="Secret value" value={secret} onChange={(e) => setSecret(e.target.value)} />
        <span className="input-group-btn">
          <button className="btn btn-success" onClick={add}>
            <span className="glyphicon glyphicon-lock" /> Encrypt
          </button>
        </span>
      </div>
      {error && <div className="alert alert-warning small" style={{ marginTop: 8 }}>{error}</div>}
      <ul className="list-unstyled vault-list">
        {entries.map((e) => (
          <li key={e.id}>
            <code className="cipher">{e.ciphertext.slice(0, 32)}…</code>
            {revealed[e.id] ? (
              <span className="text-success small"> {revealed[e.id]}</span>
            ) : (
              <button className="btn btn-link btn-xs" onClick={() => reveal(e)}>decrypt</button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
