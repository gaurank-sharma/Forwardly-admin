import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "https://forwardly-admin.onrender.com",
      "/uploads": "https://forwardly-admin.onrender.com",
    },
  },
});
