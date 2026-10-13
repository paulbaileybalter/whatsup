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

// ---------------- AI summaries (/api/summarize) ----------------
// Runs server-side only, behind the same session-cookie check as everything else.
// Uses Anthropic if the ANTHROPIC_API_KEY Secret is set, otherwise Workers AI (the `AI` binding).
// No key is ever sent to the browser.

const SUMMARY_SYSTEM = [
  "You summarise the Executive Summary points from a brewery's daily 9AM operations meeting for a weekly operations review.",
  "You get one section (e.g. QC, Packaging) with dated points. Write a plain, factual summary of the week for that section: two to three sentences, roughly 50 to 70 words, Australian English. Include the specific details that matter (products, quantities, tanks, lines, days, outcomes) rather than generalities. Use a neutral, professional tone: plain words, no dramatic, colourful or promotional language, and no filler such as \"this week\" or \"it was noted that\".",
  "Mention days where timing matters. Group repeated items. Only use facts in the points; never invent numbers, causes or actions.",
  "The points are free text typed by the team. Base the summary only on what the text itself says; the sheet field each point was typed into is not given and must not be guessed or assumed.",
  "No headings, bullets, markdown or preamble - just the summary text.",
  "Refer to each area as a team, e.g. \"the Safety Team\", \"the QC Team\", \"the Brew & Cellar Team\". Never call it a section, tile, field or area.",
].join(' ');

const SUMMARY_SYSTEM_DAILY = [
  "You write the Executive Summary for a brewery's daily 9AM operations meeting.",
  "You get today's Key Points (each tagged with its section, e.g. QC, Packaging) and today's Wins (tagged Win). Write a short plain-text summary of the day for leadership: 2-4 sentences, Australian English.",
  "Lead with what matters most; mention wins briefly if there are any. Only use facts in the points; never invent numbers, causes or actions.",
  "The points are free text typed by the team. Base the summary only on what the text itself says; the sheet field each point was typed into is not given and must not be guessed or assumed.",
  "No headings, bullets, markdown or preamble - just the summary text.",
  "Refer to each area as a team, e.g. \"the Safety Team\", \"the QC Team\", \"the Brew & Cellar Team\". Never call it a section, tile, field or area.",
].join(' ');

function sectionPrompt(sec, mode) {
  if (mode === 'daily') {
    return `Today's points (Key Points and Wins):\n` + sec.items.map(i => `- [${i.dayLabel}] ${i.value}`).join('\n');
  }
  const lines = sec.items.map(i => `- ${i.dayLabel}: ${i.value}`); // field names are deliberately left out
  const team = sec.title.replace(/\s+Updates$/i, '');
  return `Team: the ${team} Team\nPoints:\n${lines.join('\n')}`;
}

async function callLLM(env, system, prompt, maxTokens) {
  maxTokens = maxTokens || 400;
  if (env.ANTHROPIC_API_KEY) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: maxTokens, system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error('Anthropic API ' + res.status);
    const data = await res.json();
    return ((data.content || []).map(b => b.text || '').join('')).trim();
  }
  if (env.AI) {
    // Workers AI retires models from time to time, so try a short list in order.
    const models = [env.AI_MODEL, '@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.1-8b-instruct-fp8', '@cf/meta/llama-3.2-3b-instruct'].filter(Boolean);
    let lastErr;
    for (const model of models) {
      try {
        const out = await env.AI.run(model, {
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
          max_tokens: maxTokens,
        });
        let raw = out && (out.response || (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content));
        if (raw && typeof raw === 'object') raw = JSON.stringify(raw); // Workers AI can return already-parsed JSON
        const text = String(raw || '').trim();
        if (text) return text;
        lastErr = new Error('Empty response from ' + model);
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Workers AI failed');
  }
  throw new Error('No AI provider configured');
}

async function summariseOne(env, sec, mode) {
  return callLLM(env, mode === 'daily' ? SUMMARY_SYSTEM_DAILY : SUMMARY_SYSTEM, sectionPrompt(sec, mode), mode === 'daily' ? 400 : 400);
}

async function handleSummarize(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!env.AI && !env.ANTHROPIC_API_KEY) return json({ error: 'No AI provider configured on the Worker' }, 501);
  const raw = await request.text();
  if (raw.length > 100000) return json({ error: 'Request too large' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch (e) { return json({ error: 'Invalid JSON' }, 400); }
  const mode = body.mode === 'daily' ? 'daily' : 'weekly';
  const sections = Array.isArray(body.sections) ? body.sections.slice(0, 12) : [];
  const clean = sections.map(s => ({
    title: String((s && s.title) || '').slice(0, 60),
    items: (Array.isArray(s && s.items) ? s.items : []).slice(0, 60).map(i => ({
      dayLabel: String((i && i.dayLabel) || '').slice(0, 30),
      label: String((i && i.label) || '').slice(0, 200),
      value: String((i && i.value) || '').slice(0, 1500),
    })).filter(i => i.value),
  })).filter(s => s.title && s.items.length);
  if (!clean.length) return json({ error: 'No sections to summarise' }, 400);

  const summaries = {};
  const errors = [];
  await Promise.all(clean.map(async sec => {
    try { summaries[sec.title] = await summariseOne(env, sec, mode); }
    catch (e) { errors.push(sec.title + ': ' + (e.message || 'failed')); }
  }));
  if (!Object.values(summaries).some(Boolean)) return json({ error: errors[0] || 'AI request failed' }, 502);
  return json({ summaries, partialErrors: errors });
}

// ---------------- Newsletter AI (/api/newsletter) ----------------
// Works from the month's Key Points and Wins only (free text typed by the team).

const NL_COMMON = [
  "You help the Balter Brewing team (Gold Coast, Australia) write their monthly staff newsletter.",
  "You are given the month's points from the daily 9AM meeting: Key Points and Wins, each with the team it came from and the day(s) it was raised.",
  "Use only facts stated in the points. Never invent names, numbers, events, quotes or outcomes. Australian English. Warm, plain, positive newsletter tone.",
  "Only name people who are explicitly named in the points.",
].join(' ');

const NL_TASKS = {
  legend: {
    system: NL_COMMON + ' Task: shortlist candidates for "Balter Legend of the Month". Look at every mention of an employee and pick the 3 to 6 people whose mentions show real accomplishments, going above and beyond, helping others, solving problems, learning or milestones. Ignore people mentioned only in passing (for example being on leave) or only in a negative context. Reply with JSON only, in this exact shape: {"candidates":[{"name":"First Last or first name as written","mentions":3,"why":"one or two sentences on what they did","evidence":["short paraphrase of up to 3 specific points"]}]}. Order the strongest candidate first.',
    json: true, tokens: 2000,
    prompt: (b, pts) => `Month: ${b.month}\nPoints:\n${pts}`,
  },
  month: {
    system: NL_COMMON + ' Task: write a summary of everything people have accomplished around the brewery this month, for the newsletter. 120 to 180 words, one or two short paragraphs, flowing prose with no bullets, headings or markdown. Cover all teams that appear, lead with the biggest achievements, and mention people by name where the points name them. Refer to areas as teams (for example "the QC Team"), never as sections or fields.',
    tokens: 700,
    prompt: (b, pts) => `Month: ${b.month}\nPoints:\n${pts}`,
  },
  person: {
    system: NL_COMMON + ' Task: write a short summary of one person\'s accomplishments this month, for the newsletter recognising them as Balter Legend of the Month. 60 to 100 words, third person, warm and specific, plain prose with no bullets, headings or markdown. Use only the points provided, which are the ones that mention them. If the points show little, keep it short rather than padding.',
    tokens: 500,
    prompt: (b, pts) => `Month: ${b.month}\nPerson: ${b.name}\nPoints that mention them:\n${pts}`,
  },
  topics: {
    system: NL_COMMON + ' Task: suggest 6 to 9 topics for the "Around the Brewery" section of the newsletter. Each topic should be an event or accomplishment, drawn from different teams and employees where possible, that staff would enjoy reading about. Do not suggest dull routine operations. Reply with JSON only, in this exact shape: {"topics":[{"title":"short headline of up to 6 words","team":"TEAM LABEL IN CAPITALS such as SAFETY, COMMUNITY, PLANNING & LOGISTICS","blurb":"one sentence on what happened"}]}.',
    json: true, tokens: 2000,
    prompt: (b, pts) => `Month: ${b.month}\nPoints:\n${pts}`,
  },
  topic: {
    system: NL_COMMON + ' Task: write one "Around the Brewery" newsletter item about the chosen topic, using only the points that relate to it. Lead with the news, then thank the people involved by name where the points name them. Body about 70 words (60 to 80), plain prose with no bullets or markdown. Reply with JSON only, in this exact shape: {"team":"TEAM LABEL IN CAPITALS","headline":"short headline of up to 6 words","body":"the item"}.',
    json: true, tokens: 1200,
    prompt: (b, pts) => `Month: ${b.month}\nChosen topic: ${b.topic.title}${b.topic.blurb ? ' - ' + b.topic.blurb : ''}${b.topic.team ? ' (team: ' + b.topic.team + ')' : ''}\nPoints:\n${pts}`,
  },
};

function extractJson(text) {
  const t = String(text || '').replace(/```(?:json)?/gi, '');
  const s = t.indexOf('{');
  if (s < 0) return null;
  const e = t.lastIndexOf('}');
  if (e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch (err) { /* try repair below */ } }
  // Repair output cut off mid-way: walk the text, drop the unfinished tail, close open brackets.
  let stack = [], inStr = false, esc = false, lastGood = -1, snap = [];
  for (let i = s; i < t.length; i++) {
    const c = t[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') { stack.pop(); }
    if (c === '}' ) { lastGood = i; snap = stack.slice(); }
  }
  if (lastGood < 0) return null;
  const close = snap.reverse().map(c => c === '{' ? '}' : ']').join('');
  try { return JSON.parse(t.slice(s, lastGood + 1) + close); } catch (err) { return null; }
}

async function handleNewsletter(request, env) {
  const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!env.AI && !env.ANTHROPIC_API_KEY) return json({ error: 'No AI provider configured on the Worker' }, 501);
  const raw = await request.text();
  if (raw.length > 160000) return json({ error: 'Request too large' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch (e) { return json({ error: 'Invalid JSON' }, 400); }
  const task = NL_TASKS[body.task];
  if (!task) return json({ error: 'Unknown task' }, 400);
  const points = (Array.isArray(body.points) ? body.points : []).slice(0, 500).map(p => ({
    when: String((p && p.when) || '').slice(0, 40),
    team: String((p && p.team) || '').slice(0, 40),
    text: String((p && p.text) || '').slice(0, 800),
  })).filter(p => p.text);
  if (!points.length) return json({ error: 'No points to work from' }, 400);
  const b = {
    month: String(body.month || '').slice(0, 40),
    name: String(body.name || '').slice(0, 80),
    topic: { title: String((body.topic && body.topic.title) || '').slice(0, 120), blurb: String((body.topic && body.topic.blurb) || '').slice(0, 300), team: String((body.topic && body.topic.team) || '').slice(0, 60) },
  };
  if (body.task === 'person' && !b.name.trim()) return json({ error: 'A name is needed' }, 400);
  if (body.task === 'topic' && !b.topic.title.trim()) return json({ error: 'A topic is needed' }, 400);
  const pts = points.map(p => `- [${[p.when, p.team].filter(Boolean).join(' \u00b7 ')}] ${p.text}`).join('\n');
  try {
    let text = await callLLM(env, task.system, task.prompt(b, pts), task.tokens);
    if (!task.json) return json({ text });
    let data = extractJson(text);
    if (!data) { // one retry: models occasionally wrap or break the JSON
      text = await callLLM(env, task.system + ' Reply with valid JSON only, no other text.', task.prompt(b, pts), task.tokens);
      data = extractJson(text);
    }
    if (!data) return json({ error: 'The AI reply could not be read - please try again' }, 502);
    return json({ data });
  } catch (e) {
    return json({ error: e.message || 'AI request failed' }, 502);
  }
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

    // Authenticated
    if (url.pathname === '/api/summarize') return handleSummarize(request, env);
    if (url.pathname === '/api/newsletter') return handleNewsletter(request, env);

    // Serve the static site
    return env.ASSETS.fetch(request);
  },
};
