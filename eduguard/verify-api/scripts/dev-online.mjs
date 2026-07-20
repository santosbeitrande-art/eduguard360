import { spawn } from 'child_process';
import localtunnel from 'localtunnel';

const API_PORT = Number(process.env.PORT || 4000);
const apiCommand = process.platform === 'win32' ? 'cmd' : 'npm';
const apiArgs = process.platform === 'win32' ? ['/c', 'npm', 'run', 'dev'] : ['run', 'dev'];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry until timeout
    }
    await wait(800);
  }
  throw new Error(`API did not become healthy at ${url} in ${timeoutMs}ms`);
}

async function main() {
  const api = spawn(apiCommand, apiArgs, {
    stdio: 'inherit',
    env: process.env
  });

  api.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });

  try {
    await waitForHealth(`http://127.0.0.1:${API_PORT}/health`);
  } catch (error) {
    console.error(String(error));
    api.kill('SIGINT');
    process.exit(1);
  }

  const tunnel = await localtunnel({
    port: API_PORT,
    subdomain: process.env.LT_SUBDOMAIN || undefined
  });

  const publicUrl = tunnel.url;
  console.log('');
  console.log('EduGuard Verify AI online dev ativo');
  console.log(`Local API: http://127.0.0.1:${API_PORT}`);
  console.log(`Public URL: ${publicUrl}`);
  console.log(`Public Portal: ${publicUrl}/public/login`);
  console.log('');

  tunnel.on('close', () => {
    console.log('Tunnel encerrado');
  });

  const shutdown = () => {
    tunnel.close();
    api.kill('SIGINT');
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Falha ao iniciar modo online:', error);
  process.exit(1);
});
