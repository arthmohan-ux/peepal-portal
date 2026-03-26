const fs = require('fs');
const path = require('path');

const { getSession } = require('./session');

async function serveProtectedPage(event, pageFile) {
  const session = await getSession(event);
  if (!session) {
    const qs = event.rawQuery ? `?redirect=${encodeURIComponent(event.path + '?' + event.rawQuery)}` : '';
    return {
      statusCode: 302,
      headers: { Location: `/login${qs}` },
      body: '',
    };
  }

  const htmlPath = path.join(process.cwd(), 'public', pageFile);
  const html = fs.readFileSync(htmlPath, 'utf8');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: html,
  };
}

module.exports = { serveProtectedPage };
