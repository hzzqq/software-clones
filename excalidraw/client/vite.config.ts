import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the shared frontend template.
// The dev server port and API base are app-specific and overridden per app.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
