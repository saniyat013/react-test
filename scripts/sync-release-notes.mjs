// Runs before `npm run dev` / `npm run build` (predev / prebuild hooks).
// Downloads the release notes into public/mock so the app can show them.
//
// Runs in Node, so axios uses its http adapter, which follows redirects through
// follow-redirects. The download only works while follow-redirects forwards the
// Authorization header from :4010 to :4011.
import fs from 'node:fs/promises';
import axios from 'axios';
import { startContentService, TOKEN, API_PORT } from '../mock-server/content-service.mjs';

const OUT = new URL('../public/mock/release-notes.md', import.meta.url);

const service = await startContentService();
try {
  const { data } = await axios.get(`http://127.0.0.1:${API_PORT}/v1/releases/latest/notes`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    responseType: 'text',
  });
  await fs.writeFile(OUT, data);
  console.log('[sync-release-notes] saved public/mock/release-notes.md');
} catch (err) {
  const status = err.response ? `${err.response.status} ${String(err.response.data).trim()}` : err.message;
  console.error(`[sync-release-notes] FAILED: ${status}`);
  process.exitCode = 1;
} finally {
  await service.close();
}
