import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  server: { port: 5173,
      allowedHosts: [
      'skedaddle-awkward-clammy.ngrok-free.dev'
    ]},
  build: { target: 'es2020' },
});