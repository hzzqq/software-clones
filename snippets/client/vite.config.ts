import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the Snippets client.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5198,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
