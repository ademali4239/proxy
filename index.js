const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    // 1. Health check / Ping endpoint
    if (req.url === '/ping' || req.url === '/ping/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('pong');
        return;
    }

    // 2. Forward all other requests to Telegram API
    const telegramUrl = `https://api.telegram.org${req.url}`;
    
    // Copy ONLY essential headers to avoid Cloudflare/proxy block issues
    const headers = {};
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
    if (req.headers['content-length']) headers['content-length'] = req.headers['content-length'];
    if (req.headers['user-agent']) headers['user-agent'] = req.headers['user-agent'];

    const options = {
        method: req.method,
        headers: headers
    };

    const proxyReq = https.request(telegramUrl, options, (proxyRes) => {
        // Forward Telegram's headers back to your bot
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        // Stream the response back
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('[Proxy Error] Request failed:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Proxy Error', description: err.message }));
    });

    // Stream the incoming request body directly to Telegram
    req.pipe(proxyReq);
});

server.listen(PORT, () => {
    console.log(`Stream-based Telegram Proxy running on port ${PORT}`);
});
