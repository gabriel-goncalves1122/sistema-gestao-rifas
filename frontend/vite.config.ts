// ============================================================================
// ARQUIVO: frontend/vite.config.ts
// ============================================================================
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // DEV: permite abrir o Vite pelo IP da maquina no celular e tambem via
    // tunel temporario. O build/producao nao usa este servidor.
    allowedHosts: true,

    watch: {
      usePolling: true,
      interval: 500,
      // Os scripts padrao usam polling para funcionar mesmo antes do setup
      // Linux. `dev:inotify` usa este mesmo escopo com eventos nativos.
      ignored: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/docs/**",
        "**/test-results/**",
        "**/playwright-report/**",
        "**/tests/e2e/**",
      ],
    },
  },

  resolve: {
    alias: {
      // Evita imports relativos frágeis dentro de tests/features/*.
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },

  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./src/setupTests.ts",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "coverage", "tests/e2e/**"],
    clearMocks: true,
    restoreMocks: true,
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-mui": [
            "@mui/material",
            "@mui/icons-material",
            "@emotion/react",
            "@emotion/styled",
          ],
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
          ],
          "vendor-framer": ["framer-motion"],
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
});
