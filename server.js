const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const LEADS_FILE = path.join(__dirname, 'submissions.txt');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidInterest(interest) {
  return ['influencer', 'need', 'curious'].includes(interest);
}

function formatChoiceLabel(interest) {
  if (interest === 'influencer') return 'Influencer';
  if (interest === 'need') return 'Need';
  return 'Curious';
}

function appendSubmission(email, interest) {
  const now = new Date();
  const choice = formatChoiceLabel(interest);
  const line = `email=${email} | choice=${choice} | datetime=${now.toISOString()}\n`;
  fs.appendFileSync(LEADS_FILE, line, 'utf8');
}

function serveStaticFile(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const normalizedPath = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(__dirname, normalizedPath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/subscribe') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const email = String(parsed.email || '').trim().toLowerCase();
        const interest = String(parsed.interest || '').trim().toLowerCase();

        if (!isValidEmail(email)) {
          sendJson(res, 400, { message: 'Please enter a valid email address.' });
          return;
        }

        if (!isValidInterest(interest)) {
          sendJson(res, 400, { message: 'Please select influencer, need, or curious.' });
          return;
        }

        appendSubmission(email, interest);
        sendJson(res, 200, { message: 'Thanks. Your email has been recorded.' });
      } catch (error) {
        sendJson(res, 400, { message: 'Invalid request payload.' });
      }
    });

    return;
  }

  if (req.method === 'GET') {
    serveStaticFile(req, res);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
