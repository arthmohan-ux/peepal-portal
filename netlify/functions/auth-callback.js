// netlify/functions/auth-callback.js
// Handles Google OAuth redirect, validates domain, sets session cookie

const { SignJWT } = require('jose');

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

async function exchangeCode(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${process.env.NEXTAUTH_URL}/.netlify/functions/auth-callback`,
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

  if (error || !code) {
    return { statusCode: 302, headers: { Location: '/login?error=access_denied' }, body: '' };
  }

  try {
    const tokens = await exchangeCode(code);
    if (tokens.error) {
      return { statusCode: 302, headers: { Location: '/login?error=token_failed' }, body: '' };
    }

    const user = await getUserInfo(tokens.access_token);
    if (!user.email) {
      return { statusCode: 302, headers: { Location: '/login?error=no_email' }, body: '' };
    }

    const domain = user.email.split('@')[1];
    if (domain !== process.env.ALLOWED_DOMAIN) {
      return { statusCode: 302, headers: { Location: '/login?error=wrong_domain' }, body: '' };
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
        'Set-Cookie': `peepal_session=${session}; HttpOnly; ${process.env.NEXTAUTH_URL?.startsWith('https') ? 'Secure; ' : ''}SameSite=Lax; Max-Age=28800; Path=/`,
      },
      body: '',
    };

  } catch (err) {
    console.error('Auth callback error:', err);
    return { statusCode: 302, headers: { Location: '/login?error=server_error' }, body: '' };
  }
};
