// Stand-in for the internal content platform the release notes live on.
//
//   content API  (127.0.0.1:4010)  authenticates, then 302-redirects to
//   asset store  (127.0.0.1:4011)  which serves the file and ALSO checks the bearer token.
//
// Same hostname, different port: this is the "API gateway -> file service" layout
// many internal deployments use. It matters for follow-redirects: see README.
import http from 'node:http';

export const TOKEN = 'demo-release-token';
export const API_PORT = 4010;
export const STORE_PORT = 4011;

const NOTES = `## Release 2026.09.2

**Highlights**
- Directory supports bulk selection and share links
- World clock shows each teammate's local time
- Notes render \`pipeline\` blocks as diagrams

\`\`\`pipeline
lint --> test --> build --> security scan --> deploy
\`\`\`

> Shipped by the Platform team.
`;

function requireToken(req, res) {
  if (req.headers.authorization === `Bearer ${TOKEN}`) return true;
  res.writeHead(401, { 'content-type': 'text/plain' });
  res.end('401: missing or invalid bearer token');
  return false;
}

export function startContentService() {
  const api = http.createServer((req, res) => {
    if (!requireToken(req, res)) return;
    res.writeHead(302, { location: `http://127.0.0.1:${STORE_PORT}/files/release-notes.md` });
    res.end();
  });
  const store = http.createServer((req, res) => {
    if (!requireToken(req, res)) return;
    res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
    res.end(NOTES);
  });
  return new Promise((resolve) => {
    api.listen(API_PORT, '127.0.0.1', () =>
      store.listen(STORE_PORT, '127.0.0.1', () =>
        resolve({ close: () => Promise.all([api, store].map((s) => new Promise((r) => s.close(r)))) }),
      ),
    );
  });
}
