import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/**
 * Vite configuration for the chatroom client.
 * Dev server defaults to port 5200 (also passed explicitly by scripts/start-app.mjs).
 */
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5200,
        host: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
