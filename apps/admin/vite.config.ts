import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // The server deployment serves the admin console under /admin/ on the same
  // origin as the web app (only two ports are open through the OCI security
  // list - see docs/DEPLOYMENT.md). Left at '/' everywhere else so `pnpm dev`
  // still answers on http://localhost:5174/ rather than /admin/.
  base: process.env.ADMIN_BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
    // @ptg/ui is source-linked and ships its own react devDependency, so without
    // this a second React copy can be pulled into the graph.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
    // See apps/web/vite.config.ts - a silent port fallback lets a duplicate dev
    // server clobber the shared optimised-deps cache.
    strictPort: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          charts: ['recharts'],
        },
      },
    },
  },
});
