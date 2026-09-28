import { useMemo } from 'react';
import UAParser from 'ua-parser-js';

// ua-parser-js@0.7.21: several ReDoS advisories (CVE-2020-7733, CVE-2021-27292, CVE-2022-25927).
export default function DeviceBadge() {
  const ua = useMemo(() => new UAParser().getResult(), []);
  return (
    <p className="navbar-text navbar-right device-badge" title={ua.ua}>
      <span className="glyphicon glyphicon-phone" /> {ua.browser.name} {ua.browser.major} · {ua.os.name} {ua.os.version} ·{' '}
      {ua.engine.name}
    </p>
  );
}
