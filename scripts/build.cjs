const fs = require('fs');
const { execSync } = require('child_process');

// Step 1: Vite build (React client)
execSync('npx vite build', { stdio: 'inherit', cwd: process.cwd() });

// Step 2: Build server.ts for standalone mode
execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', { stdio: 'inherit', cwd: process.cwd() });

// Step 3: Build handler for Vercel serverless
if (!fs.existsSync('api-build/handler.ts')) {
  console.error('FATAL: api-build/handler.ts tidak ditemukan! Vercel handler tidak akan dibuat.');
  process.exit(1);
}
execSync('npx esbuild api-build/handler.ts --bundle --platform=node --format=esm --packages=external --outfile=api/index.mjs', { stdio: 'inherit', cwd: process.cwd() });
