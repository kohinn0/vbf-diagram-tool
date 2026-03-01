import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: './index.html',
                app: './app.html',
                shop: './shop.html'
            }
        }
    },
    server: {
        proxy: {
            // Az összes /api kérés menjen át a FastAPI backendre
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true
            },
            // statikus /data (logók, PDF-ek, stb.)
            '/data': {
                target: 'http://localhost:8000',
                changeOrigin: true
            }
        }
    }
});
