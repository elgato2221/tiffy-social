const sharp = require("sharp");
const path = require("path");

const SVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#a855f7"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>
  <text x="50%" y="54%" font-family="Arial,sans-serif" font-weight="bold" font-size="${size * 0.55}" fill="white" text-anchor="middle" dominant-baseline="middle">T</text>
</svg>`;

async function generate() {
  for (const size of [192, 512]) {
    await sharp(Buffer.from(SVG(size)))
      .png()
      .toFile(path.join(__dirname, "..", "public", `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
}

generate().catch(console.error);
