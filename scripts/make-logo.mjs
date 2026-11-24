// Draws the header's two logos as images, one for each display density, into
// src/assets/header-logo.
//
//   npm run logo
//
// The sources are the brand SVGs in public/brand: the one-line logo, which the
// header shows on wide screens, and the two-line one it shows on phones. The
// images are committed, so the site builds without running this. Run it again
// only when the artwork, a size or the header's colour changes.
//
// Why images and not the SVGs themselves: at header size a browser's own
// drawing of the SVG leaves three things visibly rough on an ordinary (1x)
// display, and each is put right here instead.
//
//   - Seams. Where two shapes share an edge, a browser lets a hairline of the
//     background through. Here every pixel is the average of 144 samples, and
//     a sample is in one shape or the other, so there is nothing to show.
//   - Thin, stepped edges. A browser blends an edge pixel as if brightness
//     were linear in the stored value, which eats into bright shapes on a
//     dark surface. Here the blend is done in linear light, onto the colour
//     the logo sits on. That is why the header's colour is baked in.
//   - Blurred straight edges. Each logo's size and position are chosen so
//     that its long horizontal and vertical edges fall on pixel boundaries
//     as nearly as they can, separately for each density.
//
// The shapes themselves are the brand's, untouched. The larger logo on the
// home page is still the SVG: at that size none of this shows.
//
// `BEHIND` BELOW MUST MATCH `--color-bg` IN src/layouts/Layout.astro, which is
// what the header paints behind the logo. If that changes, change it here and
// run this again, or the logo will sit in a visible rectangle.

import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const BEHIND = '#102348';

// Windows scales displays in quarter steps; 2 and 3 also cover macOS and phones.
const DENSITIES = [1, 1.25, 1.5, 1.75, 2, 3];

// The straight edges of the "OPEN" letters, in the artwork's own units and
// the same in both logos, and how much each matters.
const OPEN_EDGES_X = [
  [19.9426, 2], [27.9275, 2], [39.7752, 2], [46.9363, 2], [56.0113, 2], [58.9178, 2], [69.8305, 2],
  [75.1538, 2],
];

// For each logo:
//   width, height  The image's size in CSS pixels. All are multiples of 4, so
//                  that every density above gives a whole number of device
//                  pixels. Header.astro states the same numbers.
//   scale          CSS pixels per unit of the artwork. Of the scales near the
//                  size the header wants, the one at which the edges below
//                  come closest to whole pixels at 1x, and so at 2x and 3x.
//   top            CSS pixels of margin above the artwork, which centres it
//                  in the image to within a pixel.
//   edgesY, edgesX The artwork's long straight edges and how much each
//                  matters: the tops and bottoms of the letters most of all.
const LOGOS = {
  // "OPEN KEYBOARD" on one line, the letters about 24 pixels tall.
  wide: {
    art: 'logo-horizontal-inverted.svg',
    width: 272,
    height: 32,
    scale: 1.358,
    top: 3,
    edgesY: [[0.8, 3], [17.0361, 3], [0.8416, 3], [17.0145, 3], [12.6712, 2], [8.7092, 1]],
    edgesX: [...OPEN_EDGES_X, [80.5151, 1], [82.4443, 1], [94.8609, 1], [96.7901, 1]],
  },
  // "OPEN" above "KEYBOARD", about 35 pixels tall in all.
  stacked: {
    art: 'logo-horizontal-stacked-inverted.svg',
    width: 88,
    height: 40,
    scale: 1.101,
    top: 2,
    edgesY: [[0.8, 3], [17.0361, 3], [21.6313, 3], [31.8071, 3], [12.6712, 2], [8.7092, 1]],
    edgesX: [...OPEN_EDGES_X, [1.3485, 1], [2.5623, 1], [10.3746, 1], [11.5884, 1]],
  },
};

const SAMPLES = 12; // per pixel, each way

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(site, 'public', 'brand');
const out = join(site, 'src', 'assets', 'header-logo');

const toLinear = Float64Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
const toStored = (l) => Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055));
const behind = [1, 3, 5].map((at) => toLinear[parseInt(BEHIND.slice(at, at + 2), 16)]);

mkdirSync(out, { recursive: true });
for (const old of readdirSync(out)) {
  if (/\.png$/.test(old)) rmSync(join(out, old));
}

for (const [name, logo] of Object.entries(LOGOS)) {
  const source = readFileSync(join(brand, logo.art), 'utf8');
  const start = source.indexOf('<g id="Components">');
  if (start < 0) throw new Error(`${logo.art} is not laid out as expected: no "Components" group`);
  const shapes = source.slice(start, source.lastIndexOf('</svg>'));

  for (const density of DENSITIES) {
    await sharp(await draw(logo, shapes, density), {
      raw: { width: logo.width * density, height: logo.height * density, channels: 3 },
    })
      .png({ compressionLevel: 9 })
      .toFile(join(out, `${name}-${density}x.png`));
  }
}
console.log(`Logo images written to ${out}`);

/** One logo at one density, as device pixels on the header's colour. */
async function draw(logo, shapes, density) {
  const width = logo.width * density;
  const height = logo.height * density;
  const scale = logo.scale * density; // device pixels per unit of artwork
  // The artwork starts at the image's left edge and `top` below its top edge,
  // each moved by under one device pixel to wherever the edges fit this
  // density's pixels best.
  const left = fit(logo.edgesX, scale);
  const top = logo.top * density + fit(logo.edgesY, scale);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * SAMPLES}" height="${height * SAMPLES}" ` +
    `viewBox="${-left / scale} ${-top / scale} ${width / scale} ${height / scale}">${shapes}</svg>`;
  const { data, info } = await sharp(Buffer.from(svg), { limitInputPixels: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== width * SAMPLES || info.height !== height * SAMPLES) {
    throw new Error(`the renderer drew ${info.width}x${info.height}, not what was asked for`);
  }

  const pixels = Buffer.alloc(width * height * 3);
  const each = SAMPLES * SAMPLES;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, cover = 0;
      for (let j = 0; j < SAMPLES; j++) {
        let at = ((y * SAMPLES + j) * info.width + x * SAMPLES) * 4;
        for (let i = 0; i < SAMPLES; i++, at += 4) {
          const alpha = data[at + 3] / 255;
          r += toLinear[data[at]] * alpha;
          g += toLinear[data[at + 1]] * alpha;
          b += toLinear[data[at + 2]] * alpha;
          cover += alpha;
        }
      }
      const bare = 1 - cover / each;
      const to = (y * width + x) * 3;
      pixels[to] = toStored(r / each + bare * behind[0]);
      pixels[to + 1] = toStored(g / each + bare * behind[1]);
      pixels[to + 2] = toStored(b / each + bare * behind[2]);
    }
  }
  return pixels;
}

/** The offset, under one device pixel, at which these edges lie nearest to whole pixels. */
function fit(edges, scale) {
  let best = { offset: 0, miss: Infinity };
  for (let step = 0; step < 100; step++) {
    const offset = step / 100;
    let miss = 0;
    for (const [at, weight] of edges) {
      const position = at * scale + offset;
      miss += weight * Math.abs(position - Math.round(position));
    }
    if (miss < best.miss) best = { offset, miss };
  }
  return best.offset;
}
