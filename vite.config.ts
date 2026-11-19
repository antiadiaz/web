import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

function copyRootAssetsPlugin() {
  return {
    name: 'copy-root-assets',
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
