import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  define: {
    'process.env': process.env
  }
});
