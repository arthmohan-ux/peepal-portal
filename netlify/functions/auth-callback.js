// netlify/functions/auth-callback.js
// Handles Google OAuth redirect, validates domain, sets session cookie

const { SignJWT } = require('jose');
const { getRequestOrigin } = require('../lib/request-url');

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

async function exchangeCode(code, redirectUri) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  });
  return res.json();
}

async function getUserInfo(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

exports.handler = async (event) => {
  const params = new URLSearchParams(event.rawQuery || '');
  const code   = params.get('code');
  const error  = params.get('error');
  const origin = getRequestOrigin(event);
  const redirectUri = `${origin}/.netlify/functions/auth-callback`;
  const loginErrorUrl = (code) => `/login#auth_error=${encodeURIComponent(code)}`;

  if (error || !code) {
    return { statusCode: 302, headers: { Location: loginErrorUrl('access_denied') }, body: '' };
  }

  try {
    const tokens = await exchangeCode(code, redirectUri);
    if (tokens.error) {
      return { statusCode: 302, headers: { Location: loginErrorUrl('token_failed') }, body: '' };
    }

    const user = await getUserInfo(tokens.access_token);
    if (!user.email) {
      return { statusCode: 302, headers: { Location: loginErrorUrl('no_email') }, body: '' };
    }

    const domain = user.email.split('@')[1];
    if (domain !== process.env.ALLOWED_DOMAIN) {
      return { statusCode: 302, headers: { Location: loginErrorUrl('wrong_domain') }, body: '' };
    }

    const session = await new SignJWT({
      email:   user.email,
      name:    user.name,
      picture: user.picture,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(SECRET);

    // Parse state to restore candidate param after login
    const stateParam = params.get('state') || '';
    let redirectTo = '/dashboard';
    if (stateParam) {
      try {
        const stateObj = JSON.parse(stateParam);
        if (stateObj.redirect) redirectTo = stateObj.redirect;
        else if (stateObj.candidate) redirectTo = `/dashboard?candidate=${stateObj.candidate}`;
      } catch {}
    }

    return {
      statusCode: 302,
      headers: {
        Location: redirectTo,
        'Set-Cookie': `peepal_session=${session}; HttpOnly; ${origin.startsWith('https') ? 'Secure; ' : ''}SameSite=Lax; Max-Age=28800; Path=/`,
      },
      body: '',
    };

  } catch (err) {
    console.error('Auth callback error:', err);
    return { statusCode: 302, headers: { Location: loginErrorUrl('server_error') }, body: '' };
  }
};
