import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, "..", "public", "logokab.png");
const out = (name) => path.join(__dirname, "..", "public", name);

async function main() {
  await sharp(src).resize(192, 192, { fit: "contain", background: { r: 67, g: 56, b: 202, alpha: 1 } }).png().toFile(out("icon-192.png"));
  await sharp(src).resize(512, 512, { fit: "contain", background: { r: 67, g: 56, b: 202, alpha: 1 } }).png().toFile(out("icon-512.png"));
  // Maskable: konten 80% di tengah, background penuh
  const size = 512;
  const inner = Math.round(size * 0.72);
  const innerBuf = await sharp(src).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 67, g: 56, b: 202, alpha: 1 } } })
    .composite([{ input: innerBuf, gravity: "center" }])
    .png()
    .toFile(out("icon-maskable-512.png"));
  console.log("Ikon PWA berhasil dibuat.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
