# Upgrade matrix

Generated 2026-09-28T05:20:07.056Z by `npm run upgrade-matrix`.

| Scenario | Pair | Resolved | Smoke | Expected | What broke |
|---|---|---|---|---|---|
| `baseline` | - | - | 28/28 ✅ | ok | — |
| `follow-redirects-1.16.0` | axios → follow-redirects | follow-redirects@1.16.0 | 25/27 ❌ | break | **Release notes sync › download through authenticated redirect (:4010 -> :4011)**: [sync-release-notes] FAILED: 401 401: missing or invalid bearer token<br>**Markdown notes › synced release notes load**: Release notes unavailable: Request failed with status code 404 |
| `axios-0.33.0` | axios ↔ qs, axios → follow-redirects | axios@0.33.0, follow-redirects@1.16.0 | 21/27 ❌ | break | **Release notes sync › download through authenticated redirect (:4010 -> :4011)**: [sync-release-notes] FAILED: 401 401: missing or invalid bearer token<br>**User directory › loads 30 users (axios + qs paramsSerializer)**: e.paramsSerializer is not a function<br>**User directory › request URL serialized by qs**: no request recorded<br>**User directory › teammate local time (moment().tz)**: <br>**User directory › role filter -> filter[role]=admin**: <br>**Markdown notes › synced release notes load**: Release notes unavailable: Request failed with status code 404 |
| `axios-1.18.0` | axios ↔ qs, axios → follow-redirects | axios@1.18.0, follow-redirects@1.16.0 | 21/27 ❌ | break | **Release notes sync › download through authenticated redirect (:4010 -> :4011)**: [sync-release-notes] FAILED: 401 401: missing or invalid bearer token<br>**User directory › loads 30 users (axios + qs paramsSerializer)**: e.paramsSerializer is not a function<br>**User directory › request URL serialized by qs**: no request recorded<br>**User directory › teammate local time (moment().tz)**: <br>**User directory › role filter -> filter[role]=admin**: <br>**Markdown notes › synced release notes load**: Release notes unavailable: Request failed with status code 404 |
| `qs-6.5.3` | axios ↔ qs | qs@6.5.3 | 28/28 ✅ | ok | — |
| `qs-6.16.0` | axios ↔ qs | qs@6.16.0 | 22/24 ❌ | break | **User directory › panel renders**: e.map is not a function<br>**Runtime › no uncaught errors / console.error**: TypeError: e.map is not a function \| [User directory] crashed: TypeError: e.map is not a function |
| `moment-2.29.4` | moment-timezone → moment | moment@2.29.4 | 28/28 ✅ | ok | — |
| `moment-timezone-0.5.35` | moment-timezone → moment | moment-timezone@0.5.35 | 28/28 ✅ | ok | — |
| `moment-timezone-0.6.4` | moment-timezone → moment | moment-timezone@0.6.4, nested moment@2.31.0 under moment-timezone | 19/22 ❌ | break | **User directory › panel renders**: w0(...).tz is not a function<br>**World clock › panel renders**: w0.tz is not a function<br>**Runtime › no uncaught errors / console.error**: TypeError: w0.tz is not a function \| [World clock] crashed: TypeError: w0.tz is not a function \| TypeError: w0(...).tz is not a function \| [User directory] crashed: TypeError: w |
| `moment-timezone-0.6.4+moment-2.29.4` | moment-timezone → moment | moment-timezone@0.6.4, moment@2.29.4 | 28/28 ✅ | ok | — |
| `marked-4.0.10` | marked ↔ dompurify | marked@4.0.10 | 28/28 ✅ | ok | — |
| `marked-18.0.14` | marked ↔ dompurify | marked@18.0.14 | 26/28 ❌ | break | **Markdown notes › pipeline block -> diagram (marked renderer + DOMPurify)**: plan --> patch --> smoke test --> ship<br>**Markdown notes › release-notes pipeline diagram**: 0 steps |
| `dompurify-2.0.17` | marked ↔ dompurify | dompurify@2.0.17 | 28/28 ✅ | ok | — |
| `dompurify-3.4.16` | marked ↔ dompurify | dompurify@3.4.16 | 26/28 ❌ | break | **Markdown notes › pipeline block -> diagram (marked renderer + DOMPurify)**: Pipeline diagram unavailable: graph data was lost during sanitizing.<br>**Markdown notes › release-notes pipeline diagram**: Pipeline diagram unavailable: graph data was lost during sanitizing. |
| `jquery-3.5.0` | bootstrap → jquery | jquery@3.5.0 | 27/28 ❌ | break | **Legacy widgets › tooltip with custom template (Bootstrap -> jQuery parser)**: tooltip-inner ended up INSIDE tooltip-arrow: self-closing <div/> no longer expanded |
| `jquery-4.0.0` | bootstrap → jquery | jquery@4.0.0 | 2/11 ❌ | break | **User directory › panel renders**: panel not found<br>**World clock › panel renders**: panel not found<br>**Markdown notes › panel renders**: panel not found<br>**Secrets vault › panel renders**: panel not found<br>**Notification templates › panel renders**: panel not found<br>**Legacy widgets › panel renders**: panel not found<br>**Device badge › ua-parser-js detects browser**: <br>**Dependency inventory › panel renders**: panel not found<br>**Runtime › no uncaught errors / console.error**: Error: Bootstrap's JavaScript requires jQuery version 1.9.1 or higher, but lower than version 4 |
| `bootstrap-3.4.1` | bootstrap → jquery | bootstrap@3.4.1 | 25/28 ❌ | break | **Legacy widgets › tooltip with custom template (Bootstrap -> jQuery parser)**: tooltip-inner ended up INSIDE tooltip-arrow: self-closing <div/> no longer expanded<br>**Legacy widgets › confirm popover shows action buttons**: popover content: <p class="small">Mark this announcement as read for everyone on your team?</p><div class="btn-group btn-group-xs"></div><br>**Legacy widgets › acknowledge via popover button**:  |
| `bootstrap-5.3.8` | bootstrap → jquery | bootstrap@5.3.8 | 22/28 ❌ | break | **Legacy widgets › tooltip with custom template (Bootstrap -> jQuery parser)**: tooltip-inner ended up INSIDE tooltip-arrow: self-closing <div/> no longer expanded<br>**Legacy widgets › popover with html content**: no popover rendered<br>**Legacy widgets › confirm popover shows action buttons**: no popover rendered<br>**Legacy widgets › acknowledge via popover button**: <br>**Legacy widgets › modal opens via data-API**: modal fade<br>**Legacy widgets › button('loading') state**: Save settings |

## Notes

- `baseline`: Vulnerable versions as shipped.
- `follow-redirects-1.16.0`: CVE-2022-0536 / GHSA-r4q5 fix: confidential headers are dropped when the redirect changes host:port.
- `axios-0.33.0`: Latest 0.x fix line. paramsSerializer is normalized to an object; pulls follow-redirects ^1.15.4.
- `axios-1.18.0`: Latest 1.x. Same paramsSerializer change; pulls follow-redirects ^1.16.0.
- `qs-6.5.3`: Minimum fix for CVE-2022-24999 only (later qs CVEs remain).
- `qs-6.16.0`: CVE-2025-15284 fix: arrayLimit (20) now applies to a[]= bracket arrays.
- `moment-2.29.4`: Fixes both moment CVEs; still deduped with moment-timezone.
- `moment-timezone-0.5.35`: Minimum fix; still accepts moment >=2.9.0.
- `moment-timezone-0.6.4`: Requires moment ^2.29.4, so npm nests a 2nd moment; the app's moment@2.29.1 never gets .tz().
- `moment-timezone-0.6.4+moment-2.29.4`: Upgrading both together keeps a single moment instance.
- `marked-4.0.10`: Minimum fix for both marked ReDoS CVEs.
- `marked-18.0.14`: Latest: renderer methods now receive a token object.
- `dompurify-2.0.17`: Minimum fix for CVE-2020-26870 only.
- `dompurify-3.4.16`: SAFE_FOR_XML (added with the CVE-2024-45801/47875 fixes) strips attribute values containing "-->".
- `jquery-3.5.0`: CVE-2020-11022/11023 fix: htmlPrefilter no longer expands <tag/>.
- `jquery-4.0.0`: Latest major.
- `bootstrap-3.4.1`: CVE-2019-8331 fix: tooltip/popover HTML is sanitized against a whitelist (no <button>).
- `bootstrap-5.3.8`: CVE-2024-6485 has no 3.x fix; migrating to 5.x is the only way out.
