const fs = require('fs');
const { execSync } = require('child_process');

// Step 1: Vite build (React client)
execSync('npx vite build', { stdio: 'inherit', cwd: process.cwd() });

// Step 2: Build server.ts for standalone mode
execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', { stdio: 'inherit', cwd: process.cwd() });

// Step 3: Build api/handler.ts for Vercel (CJS output to bypass ESM issues)
if (fs.existsSync('api/handler.ts')) {
  execSync('npx esbuild api/handler.ts --bundle --platform=node --format=cjs --packages=external --outfile=api/index.cjs', { stdio: 'inherit', cwd: process.cwd() });
}
