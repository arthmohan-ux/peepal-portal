function getRequestOrigin(event) {
  const headers = event.headers || {};
  const host = headers['x-forwarded-host'] || headers.host;
  const proto = headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https');
  if (host) return `${proto}://${host}`;
  return process.env.NEXTAUTH_URL || process.env.URL || '';
}

module.exports = { getRequestOrigin };
