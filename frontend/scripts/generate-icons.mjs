// PWA Icon Generator — Duikclub De Robben
// Reads:  public/favicon.png (32×32)
// Writes: public/icons/icon-{size}x{size}.png (standard)
//         public/icons/icon-{size}x{size}-maskable.png (maskable, scuba-600 bg)
// Run: node scripts/generate-icons.mjs

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../public/favicon.png');
const OUT = resolve(__dirname, '../public/icons');

mkdirSync(OUT, { recursive: true });

const STANDARD_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

console.log('🎨 Generating PWA icons from favicon.png...\n');

// Standard icons: upscale with lanczos3, transparent background
for (const size of STANDARD_SIZES) {
  await sharp(SRC)
    .resize(size, size, {
      fit: 'contain',
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(resolve(OUT, `icon-${size}x${size}.png`));
  console.log(`  ✓ icon-${size}x${size}.png`);
}

// Maskable icons: logo centred in 80% safe zone, scuba-600 (#0077b6) background
for (const size of MASKABLE_SIZES) {
  const padding = Math.round(size * 0.1); // 10% each side = 80% safe zone
  const innerSize = size - padding * 2;

  await sharp(SRC)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 119, b: 182, alpha: 1 }
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 119, b: 182, alpha: 1 } // scuba-600
    })
    .png()
    .toFile(resolve(OUT, `icon-${size}x${size}-maskable.png`));
  console.log(`  ✓ icon-${size}x${size}-maskable.png (maskable)`);
}

console.log('\n✅ All PWA icons generated in public/icons/');
