// Copies the version from package.json into dist/manifest.json, so package.json is the only place to bump it.
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"));
manifest.version = version;
writeFileSync("dist/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(`extension version ${version}`);
