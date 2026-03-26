// netlify/functions/auth-login.js
// Redirects user to Google OAuth consent screen
// Preserves ?candidate= param through login via OAuth state

exports.handler = async (event, context) => {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

  // Grab any ?candidate= or ?redirect= from the login URL and pass through state
  const qs        = new URLSearchParams(event.rawQuery || '');
  const candidate = qs.get('candidate') || '';
  const redirect  = qs.get('redirect') || '';
  const stateData = {};
  if (candidate) stateData.candidate = candidate;
  if (redirect) stateData.redirect = redirect;
  const state = Object.keys(stateData).length ? JSON.stringify(stateData) : '';

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${process.env.NEXTAUTH_URL}/.netlify/functions/auth-callback`,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
    hd:            process.env.ALLOWED_DOMAIN,
  });

  if (state) params.set('state', state);

  return {
    statusCode: 302,
    headers: { Location: `${rootUrl}?${params.toString()}` },
    body: '',
  };
};
