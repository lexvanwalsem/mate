const fs = require("fs");
const lines = fs.readFileSync("src/extension/background.ts", "utf8").split("\n");
const i = lines.findIndex((l) => l.includes("const looksLikePgn"));
lines[i] = String.raw`  const looksLikePgn = (s: string) => /\[(Event|White|Black)\s+"/.test(s) && /\b1\.\s*\S+/.test(s);`;
fs.writeFileSync("src/extension/background.ts", lines.join("\n"));
