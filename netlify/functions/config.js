const { getPortalConfig } = require('../lib/portal-config');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const config = await getPortalConfig({ force: event.queryStringParameters?.force === '1' });
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, config }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
