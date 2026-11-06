import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Tauri expects a fixed port and does not want Vite to obscure Rust errors.
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          editor: [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-placeholder",
            "@tiptap/extension-link",
            "@tiptap/extension-task-list",
            "@tiptap/extension-task-item",
            "tiptap-markdown",
          ],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/modifiers", "@dnd-kit/utilities"],
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
