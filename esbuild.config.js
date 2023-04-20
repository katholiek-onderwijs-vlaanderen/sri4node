// import esbuild from "esbuild";
// import { nodeExternalsPlugin } from "esbuild-node-externals";
// import fs from "fs";
// import path from "path";

const esbuild = require("esbuild");
const { nodeExternalsPlugin } = require("esbuild-node-externals");
const fs = require("fs");
const path = require("path");

/**
 * Makes the given folder empty.
 *
 * @param {string} dirPath
 */
function emptyDir(dirPath) {
  const dirContents = fs.readdirSync(dirPath); // List dir content

  for (const fileOrDirPath of dirContents) {
    try {
      // Get Full path
      const fullPath = path.join(dirPath, fileOrDirPath);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        // It's a sub directory
        if (fs.readdirSync(fullPath).length) emptyDir(fullPath);
        // If the dir is not empty then remove it's contents too(recursively)
        fs.rmdirSync(fullPath);
      } else fs.unlinkSync(fullPath); // It's a file
    } catch (ex) {
      console.error(ex.message);
    }
  }
}

/**
 * Copy a directory recursively.
 *
 * @param {string} src  Source directory
 * @param {string} dest Destination directory
 */
async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  let entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    entry.isDirectory()
      ? await copyDir(srcPath, destPath)
      : await fs.promises.copyFile(srcPath, destPath);
  }
}

// clean the dist folder first
if (fs.existsSync("./dist")) {
  emptyDir("./dist");
}

esbuild
  .build({
    format: "esm",
    outfile: "dist/sri4node.esm.js",
    platform: "node",
    entryPoints: ["./index.ts"],
    bundle: true,
    minify: true,
    sourcemap: true,
    plugins: [nodeExternalsPlugin()],
    tsconfig: "tsconfig.json", // to generate the type definitions file
  })
  .catch(() => process.exit(1));

esbuild
  .build({
    format: "cjs",
    outfile: "dist/sri4node.cjs.js",
    platform: "node",
    entryPoints: ["./index.ts"],
    bundle: true,
    minify: true,
    sourcemap: true,
    plugins: [nodeExternalsPlugin()],
    tsconfig: "tsconfig.json", // to generate the type definitions file
  })
  .catch(() => process.exit(1));

copyDir("./js/docs", "./dist/js").catch((err) => {
  console.error("Failed to copy docs to dist folder...", err);
  process.exit(1);
});
