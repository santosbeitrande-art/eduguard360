import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

function resolveFrontendFile(fileName: string): string {
  const candidates = [
    path.join(process.cwd(), '..', 'verify-frontend', fileName),
    path.join(__dirname, '..', '..', '..', 'verify-frontend', fileName),
    path.join(__dirname, '..', '..', 'verify-frontend', fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function sendNoCacheHtml(res: express.Response, filePath: string) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.sendFile(filePath);
}

router.get('/', (_req, res) => {
  res.redirect('/public');
});

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'eduguard-verify-api' });
});

router.get('/public/login', (_req, res) => {
  sendNoCacheHtml(res, resolveFrontendFile('login.html'));
});

router.get('/public', (req, res) => {
  sendNoCacheHtml(res, resolveFrontendFile('index.html'));
});

router.get('/public/', (req, res) => {
  sendNoCacheHtml(res, resolveFrontendFile('index.html'));
});

export default router;
