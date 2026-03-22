import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    // Relatív asset útvonalak: aldomain, proxy, helyi fájl is működik (/assets 404 nélkül)
    base: './',
    plugins: [tailwindcss()],
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
