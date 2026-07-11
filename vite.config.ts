import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Work around broken date-fns package entry metadata in this environment.
      { find: /^date-fns\/locale$/, replacement: path.resolve(__dirname, "./node_modules/date-fns/locale.js") },
      { find: /^date-fns$/, replacement: path.resolve(__dirname, "./node_modules/date-fns/index.js") },
    ],
  },
});
