import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testy jednostkowe (*.test.ts obok kodu), bez sieci i prawdziwej bazy
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["**/*.test.ts", "**/*.test.tsx"], exclude: ["node_modules/**", ".next/**"] },
});
