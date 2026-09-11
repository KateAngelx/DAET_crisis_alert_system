import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "icons", "icons.svg");
const outDir = path.join(root, "public", "icons");

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

async function main() {
  if (!existsSync(svgPath)) {
    console.error("Missing public/icons/icons.svg");
    process.exit(1);
  }

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.warn("sharp not installed — skipping PNG generation. Run: npm install -D sharp && npm run generate:icons");
    process.exit(0);
  }

  const svg = readFileSync(svgPath);

  for (const { name, size } of sizes) {
    const out = path.join(outDir, name);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`Generated ${name} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
