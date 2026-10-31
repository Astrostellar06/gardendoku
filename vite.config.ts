import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, normalize } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Development only: lets the game save pictures it renders itself into the
 * project (the style menu's previews, the app icon). POST the file's bytes to
 * `/__save?path=public/previews/x.webp`; only `public/previews/` and `assets/` are writable.
 */
function saveFiles(): Plugin {
  return {
    name: 'save-files',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        const path = normalize(new URL(req.url ?? '', 'http://x').searchParams.get('path') ?? '').replace(/\\/g, '/');
        if (req.method !== 'POST' || path.includes('..') || !/^(public\/previews|assets)\/[\w.-]+$/.test(path)) {
          res.statusCode = 400;
          res.end('bad path');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [saveFiles()],
  server: { port: 5173,
      allowedHosts: [
      'skedaddle-awkward-clammy.ngrok-free.dev'
    ]},
  build: { target: 'es2020' },
});
