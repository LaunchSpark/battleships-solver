import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = __dirname;
const rootDir = path.resolve(appDir, "..");
const repoRoot = path.resolve(rootDir, "..");
const distDir = path.join(appDir, "dist");
const srcDir = path.join(appDir, "src");

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

fs.cpSync(srcDir, distDir, { recursive: true });
fs.copyFileSync(path.join(appDir, "index.html"), path.join(distDir, "index.html"));

const vendorDist = path.join(distDir, "vendor");
fs.mkdirSync(vendorDist, { recursive: true });

const reactUmd = path.join(repoRoot, "node_modules", "react", "umd", "react.development.js");
const reactDomUmd = path.join(
  repoRoot,
  "node_modules",
  "react-dom",
  "umd",
  "react-dom.development.js"
);

fs.copyFileSync(reactUmd, path.join(vendorDist, "react.development.js"));
fs.copyFileSync(reactDomUmd, path.join(vendorDist, "react-dom.development.js"));

console.log(`Copied static build to ${distDir}`);
