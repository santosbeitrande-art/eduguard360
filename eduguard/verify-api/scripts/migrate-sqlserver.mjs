import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const migrationsDir = path.resolve('sql');
const stateFile = path.resolve('sql', '.migrations-state.json');

function getConfigArgs() {
  const server = process.env.SQLSERVER_HOST || 'localhost';
  const user = process.env.SQLSERVER_USER || 'sa';
  const password = process.env.SQLSERVER_PASSWORD || 'YourStrong!Passw0rd';
  const database = process.env.SQLSERVER_DATABASE || 'eduguard_verify';
  const trustServerCertificate = process.env.SQLSERVER_TRUST_CERT !== 'false';

  const args = ['-S', server, '-U', user, '-P', password, '-d', database, '-b'];
  if (trustServerCertificate) args.push('-C');
  return args;
}

function loadState() {
  if (!fs.existsSync(stateFile)) return { applied: [] };
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return { applied: [] };
  }
}

function saveState(state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
}

function applySqlFile(filePath) {
  const baseArgs = getConfigArgs();
  const result = spawnSync('sqlcmd', [...baseArgs, '-i', filePath], {
    encoding: 'utf8'
  });

  if (result.error) {
    throw new Error(`Failed to launch sqlcmd: ${String(result.error.message || result.error)}`);
  }

  if (result.status !== 0) {
    throw new Error(`sqlcmd failed for ${path.basename(filePath)}: ${result.stderr || result.stdout}`);
  }
}

async function run() {
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No SQL migrations found.');
    return;
  }

  const state = loadState();
  const applied = new Set(Array.isArray(state.applied) ? state.applied : []);

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    console.log(`Applying ${file}...`);
    applySqlFile(filePath);
    applied.add(file);
    saveState({ applied: [...applied], updatedAt: new Date().toISOString() });
    console.log(`Applied ${file}`);
  }

  console.log('SQL Server migrations complete.');
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
