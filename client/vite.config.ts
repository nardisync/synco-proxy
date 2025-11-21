import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import flowbiteReact from "flowbite-react/plugin/vite";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  css: {
    postcss: path.resolve(__dirname, "../../postcss.config.js"),
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // ⚠️ E' importante che questa regola non catturi i percorsi destinati a /api/moxfield!
      "/api": { 
          target: "http://localhost:3001",
          changeOrigin: true,
      },
      
      '/mox-api': { // <--- NUOVO PREFISSO
        target: 'https://api2.moxfield.com', 
        changeOrigin: true,
        secure: true,
        // ✅ Riscrittura per rimuovere il nuovo prefisso '/mox-api'
        rewrite: (path) => path.replace(/^\/mox-api/, '') 
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [react(), tailwindcss(), flowbiteReact()],
});
