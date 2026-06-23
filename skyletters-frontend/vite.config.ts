import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El frontend corre en :5173 (origen permitido por CORS de la API).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
