import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  publicDir: "public",
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    // distフォルダに出力
    outDir: "dist",
    // 存在しないときはフォルダを作成する
    emptyOutDir: true,
    copyPublicDir: true,
    rollupOptions: {
      // entry pointがあるindex.htmlのパス
      input: {
        "": "index.html",
      },
      // bundle.jsを差し替えする
      output: {
        entryFileNames: "assets/bundle.js",
      },
    },
  },
});
