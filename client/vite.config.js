import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El frontend corre en :5173 y llama a la API en :4000.
// El proxy evita problemas de CORS y permite usar rutas relativas (/api, /uploads).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Permite servir a través de túneles (cloudflared/ngrok) para probar en el
    // celular por HTTPS. `true` acepta cualquier host (solo dev).
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
});
