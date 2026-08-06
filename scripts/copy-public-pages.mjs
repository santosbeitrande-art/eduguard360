import fs from 'fs';
import path from 'path';

const root = process.cwd();
const sourceDir = path.join(root, 'eduguard', 'verify-frontend');
const outputDir = path.join(root, 'dist', 'public');

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Source directory not found: ${sourceDir}`);
}

fs.mkdirSync(outputDir, { recursive: true });

for (const fileName of ['index.html', 'login.html']) {
  const sourceFile = path.join(sourceDir, fileName);
  const targetFile = path.join(outputDir, fileName);
  fs.copyFileSync(sourceFile, targetFile);
}

// Filesystem alias for clean URL /public/login.
const loginAliasDir = path.join(outputDir, 'login');
fs.mkdirSync(loginAliasDir, { recursive: true });
fs.copyFileSync(path.join(sourceDir, 'login.html'), path.join(loginAliasDir, 'index.html'));
