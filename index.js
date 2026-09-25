Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1. Health check / Ping endpoint
  if (url.pathname === '/ping' || url.pathname === '/ping/') {
    return new Response('pong', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // 2. Forward all other requests to Telegram API
  const cleanPath = url.pathname.replace(/^\/+/, '/');
  const targetUrl = new URL(cleanPath + url.search, 'https://api.telegram.org');

  // Copy essential headers
  const headers = new Headers();
  if (req.headers.has('content-type')) headers.set('content-type', req.headers.get('content-type'));
  if (req.headers.has('content-length')) headers.set('content-length', req.headers.get('content-length'));
  if (req.headers.has('user-agent')) headers.set('user-agent', req.headers.get('user-agent'));
  headers.set('Host', 'api.telegram.org');

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'follow',
    });

    // Stream the Telegram response back to the bot
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (err) {
    console.error('[Proxy Error] Request failed:', err.message);
    return new Response(
      JSON.stringify({ ok: false, error: 'Proxy Error', description: err.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
