const fs = require('fs');
const { execSync } = require('child_process');

// Step 1: Vite build (React client)
execSync('npx vite build', { stdio: 'inherit', cwd: process.cwd() });

// Step 2: Build server.ts for standalone mode
execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', { stdio: 'inherit', cwd: process.cwd() });

// Step 3: Build api/index.ts for Vercel (CJS output to bypass ESM issues)
const apiEntry = 'api/index.ts';
if (fs.existsSync(apiEntry)) {
  execSync(`npx esbuild ${apiEntry} --bundle --platform=node --format=cjs --packages=external --outfile=api/index.js`, { stdio: 'inherit', cwd: process.cwd() });
  // Remove .ts source so Vercel uses the .js file directly
  fs.unlinkSync(apiEntry);
}
