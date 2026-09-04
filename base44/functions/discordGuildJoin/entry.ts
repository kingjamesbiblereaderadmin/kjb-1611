// Handles the Discord OAuth redirect after a user adds the KJB Reader Bot to
// their server. Discord redirects here with ?code=... after authorization;
// we respond with a branded welcome HTML page (no token exchange needed for
// the bot-install flow — the bot join happens on Discord's side).
Deno.serve(async (req) => {
  try {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KJB Reader Bot — Welcome</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #5b21b6 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      color: #1e1b4b;
    }
    .card {
      background: #ffffff;
      border-radius: 1.5rem;
      max-width: 28rem;
      width: 100%;
      padding: 2.5rem 2rem;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
    }
    .icon-wrap {
      width: 4.5rem;
      height: 4.5rem;
      margin: 0 auto 1.25rem;
      border-radius: 1.25rem;
      background: linear-gradient(135deg, #4338ca, #6d28d9);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
    }
    .icon-wrap svg { width: 2.5rem; height: 2.5rem; fill: #ffffff; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #1e1b4b; margin-bottom: 0.5rem; }
    .subtitle { font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem; }
    .divider { width: 3rem; height: 2px; background: #6d28d9; margin: 0 auto 1.5rem; border-radius: 1px; }
    .message { font-size: 0.95rem; color: #374151; line-height: 1.6; margin-bottom: 1.75rem; }
    .message strong { color: #4338ca; }
    .features { text-align: left; margin-bottom: 1.75rem; padding: 0 0.5rem; }
    .feature { display: flex; align-items: center; gap: 0.625rem; font-size: 0.875rem; color: #374151; margin-bottom: 0.625rem; }
    .feature svg { width: 1.125rem; height: 1.125rem; fill: #6d28d9; flex-shrink: 0; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.75rem;
      border-radius: 0.75rem;
      background: linear-gradient(135deg, #4338ca, #6d28d9);
      color: #ffffff;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrap">
      <svg viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
    </div>
    <h1>Welcome to KJB Reader Bot!</h1>
    <p class="subtitle">For random, search, daily, and gospel sharing.</p>
    <div class="divider"></div>
    <p class="message">
      <strong>The bot has been added to your server.</strong><br/>
      Try these slash commands in any channel:
    </p>
    <div class="features">
      <div class="feature">
        <svg viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
        <span><strong>/daily</strong> — Verse of the Day</span>
      </div>
      <div class="feature">
        <svg viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
        <span><strong>/random</strong> — A random verse</span>
      </div>
      <div class="feature">
        <svg viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
        <span><strong>/search</strong> — Search the Bible by keyword</span>
      </div>
      <div class="feature">
        <svg viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
        <span><strong>/gospel</strong> — Share the gospel</span>
      </div>
    </div>
    <a href="https://kingjamesbiblereader.com" class="btn">Open KJB Reader</a>
  </div>
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    return new Response('Internal error', { status: 500 });
  }
});