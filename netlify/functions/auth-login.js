// netlify/functions/auth-login.js
// Redirects user to Google OAuth consent screen

exports.handler = async (event, context) => {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${process.env.NEXTAUTH_URL}/.netlify/functions/auth-callback`,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
    hd:            process.env.ALLOWED_DOMAIN,
  });

  return {
    statusCode: 302,
    headers: { Location: `${rootUrl}?${params.toString()}` },
    body: '',
  };
};
