import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Transformers.js ships its own pre-bundled ESM + WASM. Let Vite serve it
  // as-is instead of trying to pre-bundle the ONNX runtime.
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  build: {
    target: "esnext",
  },
});
