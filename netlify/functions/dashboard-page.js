const { serveProtectedPage } = require('../lib/serve-protected-page');

exports.handler = async (event) => serveProtectedPage(event, 'dashboard.html');
