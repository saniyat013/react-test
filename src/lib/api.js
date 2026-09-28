// HTTP layer. Uses three linked packages together:
//   axios@0.21.1          -> HTTP client
//   └─ follow-redirects   -> transitive dependency of axios, pinned via "overrides" to 1.14.0
//   qs@6.5.2              -> serializes nested params for axios (paramsSerializer)
//   uuid@3.4.0            -> deprecated deep import used for request correlation ids
import axios from 'axios';
import qs from 'qs';
import uuidv4 from 'uuid/v4';

const client = axios.create({
  baseURL: '/mock',
  timeout: 5000,
  // axios's built-in serializer can't encode nested objects the way our
  // backend expects (filter[role]=admin), so we delegate to qs.
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'brackets', encode: false }),
});

const lastRequests = {};

client.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = uuidv4();
  lastRequests[config.url] = {
    id: config.headers['X-Request-Id'],
    url: `${config.baseURL}${config.url}${config.params ? `?${config.paramsSerializer(config.params)}` : ''}`,
  };
  return config;
});

export const getLastRequest = (url) => lastRequests[url] ?? null;

export async function fetchUsers({ role, search } = {}) {
  const { data } = await client.get('/users.json', {
    params: { filter: { role: role || undefined, q: search || undefined }, fields: ['name', 'email', 'team'] },
  });
  // The static mock ignores query params, so filter client-side.
  return data
    .filter((u) => !role || u.role === role)
    .filter((u) => !search || u.name.toLowerCase().includes(search.toLowerCase()));
}

export async function fetchAnnouncement() {
  const { data } = await client.get('/announcement.json');
  return data;
}

export async function fetchReleaseNotes() {
  const { data } = await client.get('/release-notes.md', { responseType: 'text' });
  return data;
}
