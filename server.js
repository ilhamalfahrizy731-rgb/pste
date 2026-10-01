const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
const RAW_DIR = path.join(ROOT, 'r');
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 1024 * 1024;
const EXTENSIONS = new Set(['', 'html', 'css', 'js']);
const MIME_TYPES = {
  '': 'text/plain; charset=utf-8',
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8'
};

fs.mkdirSync(RAW_DIR, { recursive: true });

function send(res, status, data, headers = {}) {
  res.writeHead(status, {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers
  });
  res.end(data);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Ukuran paste maksimal 1 MB.'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(Object.assign(new Error('Format request tidak valid.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function idFromIndex(index) {
  let letters = '';
  let n = index;
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 97) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

function nextAvailableId() {
  for (let index = 0; ; index += 1) {
    const letters = idFromIndex(index);
    for (let digit = 1; digit <= 9; digit += 1) {
      const id = `${letters}${digit}`;
      const used = [...EXTENSIONS].some(ext =>
        fs.existsSync(path.join(RAW_DIR, ext ? `${id}.${ext}` : id))
      );
      if (!used) return id;
    }
  }
}

function serveStatic(res, file, contentType) {
  fs.readFile(file, (error, data) => {
    if (error) return send(res, 404, 'Halaman tidak ditemukan.');
    send(res, 200, data, { 'Content-Type': contentType });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/') {
    return serveStatic(res, path.join(ROOT, 'index.html'), 'text/html; charset=utf-8');
  }
  if (req.method === 'GET' && url.pathname === '/styles.css') {
    return serveStatic(res, path.join(ROOT, 'styles.css'), 'text/css; charset=utf-8');
  }
  if (req.method === 'GET' && url.pathname === '/app.js') {
    return serveStatic(res, path.join(ROOT, 'app.js'), 'text/javascript; charset=utf-8');
  }

  if (req.method === 'POST' && url.pathname === '/api/pastes') {
    try {
      const payload = await readJson(req);
      const code = typeof payload.code === 'string' ? payload.code : '';
      const ext = typeof payload.extension === 'string' ? payload.extension.toLowerCase() : '';
      if (!code.trim()) return send(res, 400, JSON.stringify({ error: 'Kode tidak boleh kosong.' }), { 'Content-Type': 'application/json' });
      if (!EXTENSIONS.has(ext)) return send(res, 400, JSON.stringify({ error: 'Ekstensi hanya boleh kosong, html, css, atau js.' }), { 'Content-Type': 'application/json' });
      if (Buffer.byteLength(code, 'utf8') > MAX_BODY_BYTES) return send(res, 413, JSON.stringify({ error: 'Ukuran paste maksimal 1 MB.' }), { 'Content-Type': 'application/json' });

      const id = nextAvailableId();
      const filename = ext ? `${id}.${ext}` : id;
      fs.writeFileSync(path.join(RAW_DIR, filename), code, { flag: 'wx' });
      const origin = `http://${req.headers.host || `localhost:${PORT}`}`;
      return send(res, 201, JSON.stringify({ id, url: `${origin}/r/${filename}` }), {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
    } catch (error) {
      const status = error.status || (error.code === 'EEXIST' ? 409 : 500);
      const message = error.status ? error.message : 'Paste gagal disimpan.';
      return send(res, status, JSON.stringify({ error: message }), { 'Content-Type': 'application/json; charset=utf-8' });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/r/')) {
    const filename = decodeURIComponent(url.pathname.slice(3));
    const match = filename.match(/^([a-z]+[1-9])(?:\.(html|css|js))?$/);
    if (!match) return send(res, 404, 'Paste tidak ditemukan.');
    const ext = match[2] || '';
    const file = path.join(RAW_DIR, filename);
    return fs.readFile(file, (error, data) => {
      if (error) return send(res, 404, 'Paste tidak ditemukan.');
      const headers = {
        'Content-Type': MIME_TYPES[ext],
        'Cache-Control': 'public, max-age=60',
        'Content-Security-Policy': "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox"
      };
      return send(res, 200, data, headers);
    });
  }

  send(res, 404, 'Rute tidak ditemukan.');
});

server.listen(PORT, () => {
  console.log(`Pastebin berjalan di http://localhost:${PORT}`);
  console.log(`File raw disimpan di ${RAW_DIR}`);
});
