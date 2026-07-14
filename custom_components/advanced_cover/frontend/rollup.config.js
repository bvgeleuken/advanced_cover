import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import { readFileSync } from "fs";
import { resolve } from "path";

// Read version from VERSION file in project root
const versionPath = resolve("../../../VERSION");
const version = readFileSync(versionPath, "utf-8").trim();

export default {
  input: "src/advanced-cover-panel.ts",
  output: {
    file: "dist/advanced-cover-panel.js",
    format: "es",
    sourcemap: true,
  },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __VERSION__: `"${version}"`,
      },
    }),
    nodeResolve({ extensions: [".ts", ".js"] }),
    typescript({ tsconfig: "./tsconfig.json" }),
  ],
};
