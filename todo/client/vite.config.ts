import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the Todo client.
// Dev server port is fixed per-app; API base is injected via VITE_API_BASE (.env).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5202,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
