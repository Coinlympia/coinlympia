// rollup.config.js
const typescript = require("@rollup/plugin-typescript");
const commonjs = require("@rollup/plugin-commonjs");
const nodeResolve = require("@rollup/plugin-node-resolve");
const terser = require("@rollup/plugin-terser");
const replace = require("@rollup/plugin-replace");
const path = require("path");
const image = require("@rollup/plugin-image");
const pluginJson = require("@rollup/plugin-json");
const nodePolyfills = require("rollup-plugin-polyfill-node");

const pa = path.join(process.cwd(), "..");

exports.default = {
  input: "src/widgets/swap/index.tsx",
  output: {
    file: "dist/index.js",
    format: "iife",
  },
  plugins: [
    nodeResolve({ browser: true, rootDir: pa }),
    commonjs(),
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify("production"),
      __buildDate__: () => JSON.stringify(new Date()),
      __buildVersion: 15,
    }),
    typescript(),
    image(),
    pluginJson(),
    nodePolyfills(),
    terser(),
  ],
};
