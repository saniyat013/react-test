// Runs before `npm run dev` / `npm run build` (predev / prebuild hooks).
// Downloads the release notes into public/mock so the app can show them.
//
// Runs in Node, so axios uses its http adapter. Newer follow-redirects strips
// Authorization across host:port redirects, so the trusted local asset redirect is
// followed explicitly after validating its destination.
import fs from 'node:fs/promises';
import axios from 'axios';
import { startContentService, TOKEN, API_PORT, STORE_PORT } from '../mock-server/content-service.mjs';

const OUT = new URL('../public/mock/release-notes.md', import.meta.url);
const AUTHORIZATION = `Bearer ${TOKEN}`;

async function downloadReleaseNotes() {
  const response = await axios.get(`http://127.0.0.1:${API_PORT}/v1/releases/latest/notes`, {
    headers: { Authorization: AUTHORIZATION },
    maxRedirects: 0,
    responseType: 'text',
    validateStatus: (status) => status >= 200 && status < 400,
  });
  if (response.status < 300) return response.data;

  const redirect = new URL(response.headers.location, `http://127.0.0.1:${API_PORT}`);
  if (redirect.hostname !== '127.0.0.1' || redirect.port !== String(STORE_PORT)) {
    throw new Error(`unexpected release notes redirect to ${redirect.origin}`);
  }

  const { data } = await axios.get(redirect.href, {
    headers: { Authorization: AUTHORIZATION },
    responseType: 'text',
  });
  return data;
}

const service = await startContentService();
try {
  await fs.writeFile(OUT, await downloadReleaseNotes());
  console.log('[sync-release-notes] saved public/mock/release-notes.md');
} catch (err) {
  const status = err.response ? `${err.response.status} ${String(err.response.data).trim()}` : err.message;
  console.error(`[sync-release-notes] FAILED: ${status}`);
  process.exitCode = 1;
} finally {
  await service.close();
}
