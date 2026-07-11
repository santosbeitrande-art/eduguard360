import express from 'express';
import path from 'path';
import fs from 'fs';
import { getSession } from './auth';

const router = express.Router();

function getDeployVersion() {
  return process.env.EDUGUARD_DEPLOY_VERSION || 'dev';
}

function sendNoCacheHtml(res: express.Response, filePath: string) {
  res.setHeader('X-Deploy-Version', getDeployVersion());
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.sendFile(filePath);
}

router.get('/', (_req, res) => {
  res.redirect(`/public?v=${encodeURIComponent(getDeployVersion())}`);
});

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'eduguard-verify-api' });
});

router.get('/public/login', (_req, res) => {
  sendNoCacheHtml(res, path.join(__dirname, '..', '..', 'verify-frontend', 'login.html'));
});

router.get('/public', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.redirect(`/public/login?v=${encodeURIComponent(getDeployVersion())}`);
  }
  sendNoCacheHtml(res, path.join(__dirname, '..', '..', 'verify-frontend', 'index.html'));
});

router.get('/public/', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.redirect(`/public/login?v=${encodeURIComponent(getDeployVersion())}`);
  }
  sendNoCacheHtml(res, path.join(__dirname, '..', '..', 'verify-frontend', 'index.html'));
});

export default router;
