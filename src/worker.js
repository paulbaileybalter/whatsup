// Balter, What's Up — Daily 9am Meeting
// Password gate: every route (including static files) is checked for a valid,
// HMAC-signed session cookie before anything is served. Same pattern as the
// sibling Logistics Handover / 13:30 Handover Meeting Workers.

const COOKIE_NAME = 'balter_9am_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

// ---------------- HMAC session token ----------------

async function hmacSha256Hex(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return [...new Uint8Array(sigBuf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function createSessionToken(secret) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const sig = await hmacSha256Hex(secret, String(expires));
  return `${expires}.${sig}`;
}

async function verifySessionToken(token, secret) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expiresStr, sig] = parts;
  const expires = parseInt(expiresStr, 10);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expectedSig = await hmacSha256Hex(secret, expiresStr);
  return timingSafeEqual(sig, expectedSig);
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function sessionCookieHeader(token, maxAgeSeconds) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

// ---------------- Login page ----------------

function loginPageHtml(showError) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Balter, What's Up — Login</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', ui-sans-serif, sans-serif;
    background: #F5F5F4; display: flex; align-items: center; justify-content: center;
    min-height: 100vh; margin: 0; padding: 20px;
  }
  .card {
    background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 18px;
    padding: 36px 34px; width: 100%; max-width: 360px;
    box-shadow: 0 12px 32px -8px rgba(20,22,26,.18);
  }
  .mark { width: 34px; height: 34px; margin-bottom: 14px; }
  h1 { font-family: 'Space Grotesk', sans-serif; font-size: 19px; margin: 0 0 4px; color: #14161a; }
  p.sub { color: #6b7280; font-size: 13px; margin: 0 0 22px; }
  label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
  input[type=password] {
    width: 100%; padding: 10px 12px; border: 1px solid #D1D5DB; border-radius: 10px;
    font-size: 14px; margin-bottom: 16px; font-family: inherit;
  }
  input[type=password]:focus { outline: none; border-color: #47D7AC; box-shadow: 0 0 0 3px rgba(71,215,172,.25); }
  button {
    width: 100%; padding: 11px; border: none; border-radius: 999px; background: #14161a;
    color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit;
  }
  button:hover { background: #26282d; }
  .error {
    background: #FDEEEE; color: #A32A2A; border: 1px solid #F3B9B9; border-radius: 8px;
    padding: 9px 12px; font-size: 12.5px; margin-bottom: 16px;
  }
</style>
</head>
<body>
  <form class="card" method="POST" action="/login">
    <svg class="mark" viewBox="0 0 161 161" xmlns="http://www.w3.org/2000/svg">
      <path fill="#47D7AC" d="M136.3,70.4l-9.4-9.4c-1.6-1.6-4.3-1.6-6,0-1.6,1.6-1.6,4.3,0,6l2.3,2.3c-9.6,13.2-25.2,21.7-42.7,21.7s-33.1-8.6-42.7-21.8l2.3-2.3c1.6-1.6,1.6-4.3,0-6-1.6-1.6-4.3-1.6-6,0l-9.4,9.4c-1.6,1.6-1.6,4.3,0,6,.8.8,1.9,1.2,3,1.2s2.2-.4,3-1.2l1.1-1.1c11.2,14.7,28.9,24.2,48.7,24.2s37.5-9.5,48.7-24.2l1.1,1.1c.8.8,1.9,1.2,3,1.2s2.2-.4,3-1.2c1.6-1.6,1.6-4.3,0-6"/>
      <path fill="#47D7AC" d="M152.5,8.5v144H8.5V8.5h144M161,0H0v161h161V0h0Z"/>
    </svg>
    <h1>Balter, What's Up</h1>
    <p class="sub">Enter the site password to continue.</p>
    ${showError ? `<div class="error">Incorrect password — try again.</div>` : ''}
    <label for="password">Password</label>
    <input type="password" id="password" name="password" autocomplete="current-password" autofocus required>
    <button type="submit">Unlock</button>
  </form>
</body>
</html>`;
}

// ---------------- Worker ----------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- Login form (GET shows it, POST checks the password) ---
    if (url.pathname === '/login') {
      if (request.method === 'POST') {
        const form = await request.formData();
        const password = form.get('password') || '';
        if (password === env.SITE_PASSWORD) {
          const token = await createSessionToken(env.SESSION_SECRET);
          const headers = new Headers({ Location: '/' });
          headers.append('Set-Cookie', sessionCookieHeader(token, SESSION_TTL_SECONDS));
          return new Response(null, { status: 302, headers });
        }
        return new Response(loginPageHtml(true), {
          status: 401,
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }
      return new Response(loginPageHtml(false), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    }

    // --- Logout: clear the cookie, send back to login ---
    if (url.pathname === '/logout') {
      const headers = new Headers({ Location: '/login' });
      headers.append('Set-Cookie', sessionCookieHeader('', 0));
      return new Response(null, { status: 302, headers });
    }

    // --- Everything else requires a valid session ---
    const cookie = getCookie(request, COOKIE_NAME);
    const authed = await verifySessionToken(cookie, env.SESSION_SECRET);
    if (!authed) {
      return new Response(null, { status: 302, headers: { Location: '/login' } });
    }

    // Authenticated — serve the static site
    return env.ASSETS.fetch(request);
  },
};
