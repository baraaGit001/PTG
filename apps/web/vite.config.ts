import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
    // @ptg/ui is source-linked and ships its own react devDependency, so without
    // this a second React copy can be pulled into the graph.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    // Fail loudly instead of drifting to 5174/5175: two instances of the same app
    // share node_modules/.vite/deps and clobber each other's optimised bundles,
    // which surfaces in the browser as modules served with an empty MIME type.
    strictPort: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
