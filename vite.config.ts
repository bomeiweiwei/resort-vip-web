import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const proxy = env.VITE_PROXY_API
    ? {
      "/api": {
        target: env.VITE_PROXY_API,
        changeOrigin: true,
        secure: false,
      },
    }
    : undefined;

  return {
    plugins: [react()],
    server: {
      proxy,
    },
  };
});