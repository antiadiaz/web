import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';

function copyRootAssetsPlugin(): Plugin {
  return {
    name: 'copy-root-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '';
        const [pathname, search = ''] = rawUrl.split('?');
        if (pathname === '/writing/' || pathname === '/illustration/') {
          res.statusCode = 302;
          res.setHeader('Location', `${pathname.slice(0, -1)}${search ? `?${search}` : ''}`);
          res.end();
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '';
        const [pathname, search = ''] = rawUrl.split('?');
        if (pathname === '/writing/' || pathname === '/illustration/') {
          res.statusCode = 302;
          res.setHeader('Location', `${pathname.slice(0, -1)}${search ? `?${search}` : ''}`);
          res.end();
          return;
        }
        next();
      });
    },
    closeBundle() {
      const rootDir = import.meta.dirname;
      const distDir = path.resolve(rootDir, 'dist');
      const srcAssets = path.resolve(rootDir, 'assets');
      const destAssets = path.resolve(distDir, 'assets');

      if (fs.existsSync(srcAssets)) {
        fs.cpSync(srcAssets, destAssets, {recursive: true});
      }

      const nojekyllSrc = path.resolve(rootDir, '.nojekyll');
      const nojekyllDest = path.resolve(distDir, '.nojekyll');
      if (fs.existsSync(nojekyllSrc)) {
        fs.copyFileSync(nojekyllSrc, nojekyllDest);
      }

      const indexHtmlPath = path.resolve(distDir, 'index.html');
      if (fs.existsSync(indexHtmlPath)) {
        const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
        fs.writeFileSync(
          path.resolve(distDir, 'writing.html'),
          indexHtml.replace(
            '<title>Antia Diaz — Structural Foundation</title>',
            '<title>Antía Díaz — Writing</title>',
          ),
        );
        fs.writeFileSync(
          path.resolve(distDir, 'illustration.html'),
          indexHtml.replace(
            '<title>Antia Diaz — Structural Foundation</title>',
            '<title>Antía Díaz — Editorial Illustration &amp; Character Design</title>',
          ),
        );
        fs.writeFileSync(path.resolve(distDir, '404.html'), indexHtml);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), copyRootAssetsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
