import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests (*.test.ts next to the code), without network or a real database
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["**/*.test.ts", "**/*.test.tsx"], exclude: ["node_modules/**", ".next/**"] },
});
