import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the Bookmarks client.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5197,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
