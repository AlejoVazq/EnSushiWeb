// Bundles the app into dist/: main process and preload for Node (Electron), the window for the browser.
import { copyFileSync, mkdirSync } from 'node:fs';

import { build } from 'esbuild';

mkdirSync('dist', { recursive: true });

const common = { bundle: true, sourcemap: true, logLevel: 'warning', target: 'es2022' };

await Promise.all([
  // electron-updater stays out of the bundle: the installer ships it from node_modules
  build({ ...common, entryPoints: ['src/main.ts'], outfile: 'dist/main.js', platform: 'node', format: 'cjs', external: ['electron', 'electron-updater'] }),
  build({ ...common, entryPoints: ['src/preload.ts'], outfile: 'dist/preload.js', platform: 'node', format: 'cjs', external: ['electron'] }),
  build({
    ...common,
    entryPoints: ['src/renderer/index.tsx'],
    outfile: 'dist/renderer.js',
    platform: 'browser',
    format: 'iife',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  }),
]);

copyFileSync('src/renderer/index.html', 'dist/index.html');
console.log('Listo: dist/');
