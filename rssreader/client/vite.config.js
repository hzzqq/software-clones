import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Vite configuration for the rssreader frontend.
// The dev server port and API base are overridden per app by scripts/apps.mjs
// (`--port <clientPort>` and `VITE_API_BASE`); defaults below match the app.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5194,
        host: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
