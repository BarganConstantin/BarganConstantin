// Builds ../assets/banner-{dark,light}.svg for the profile README.
// Every glyph is outlined to a path: an SVG shown through <img> on GitHub cannot load fonts.
import * as fontkit from 'fontkit';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const out = join(here, '..', 'assets');
mkdirSync(out, { recursive: true });

// Fonts come from pinned release tags (both SIL OFL 1.1) and are cached in build/fonts/, which is not committed.
const FONTS = {
  'MonaSansVF.ttf': 'https://raw.githubusercontent.com/github/mona-sans/v2.0.27/fonts/variable/MonaSansVF%5Bopsz,wght%5D.ttf',
  'GeistMono-Regular.ttf': 'https://raw.githubusercontent.com/vercel/geist-font/v1.7.2/fonts/GeistMono/ttf/GeistMono-Regular.ttf',
};
mkdirSync(join(here, 'fonts'), { recursive: true });
for (const [file, url] of Object.entries(FONTS)) {
  const path = join(here, 'fonts', file);
  if (existsSync(path)) continue;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

const mona = fontkit.openSync(join(here, 'fonts/MonaSansVF.ttf'));
const F = {
  display: mona.getVariation({ wght: 640, opsz: 100 }),
  title: mona.getVariation({ wght: 600, opsz: 32 }),
  body: mona.getVariation({ wght: 450, opsz: 28 }),
  mono: fontkit.openSync(join(here, 'fonts/GeistMono-Regular.ttf')),
};

const r1 = (n) => Math.round(n * 10) / 10;

// One text run -> one <path>; tracking is in em.
function run(font, str, size, tracking = 0) {
  const upem = font.unitsPerEm;
  const { glyphs, positions } = font.layout(str);
  let x = 0;
  const ds = [];
  glyphs.forEach((g, i) => {
    const p = positions[i];
    ds.push(g.path.translate(x + p.xOffset, p.yOffset).toSVG());
    x += p.xAdvance + (i < glyphs.length - 1 ? tracking * upem : 0);
  });
  const d = ds.join('').replace(/-?\d+(\.\d+)?/g, (n) => String(Math.round(+n)));
  return { d, width: (x * size) / upem, scale: size / upem };
}
function text(font, str, size, x, y, fill, tracking = 0) {
  const t = run(font, str, size, tracking);
  return `<path fill="${fill}" transform="translate(${r1(x)} ${r1(y)}) scale(${t.scale} ${-t.scale})" d="${t.d}"/>`;
}
const width = (font, str, size, tracking = 0) => run(font, str, size, tracking).width;

// Kit files, used unchanged and only wrapped in a transform. Light ground takes mono-dark (kit rule 5).
const kit = (name) => readFileSync(join(here, 'kit', name), 'utf8')
  .replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>.*?<\/title>/, '');
const MARK = { dark: kit('ccdeck-mark-gradient-small-optical.svg'), light: kit('ccdeck-mark-mono-dark-small-optical.svg') };

// ccdeck.dev tokens on dark; the light set keeps the same roles at GitHub-light contrast.
const THEMES = {
  dark: {
    plate: '#0e0d0c', plateLine: '#242220', dot: '#1d1b19',
    card: '#1a1917', cardLine: '#302d2a',
    ink: '#f0efe9', ink2: '#c2beb6', ink3: '#969189',
    accent: '#b9d3f4', edge: '#433f3a',
  },
  light: {
    plate: '#fbfaf8', plateLine: '#e5e2dd', dot: '#e8e5e0',
    card: '#ffffff', cardLine: '#dcd8d2',
    ink: '#0b0f14', ink2: '#57534e', ink3: '#78716c',
    accent: '#2f5b94', edge: '#c4bfb8',
  },
};

const TITLE = 'Constantin Bargan, software engineer in Chișinău. C# and .NET at work; after hours he builds ccdeck.';

// Sizes are set for the phone, where the 846px banner shows at about 0.36x.
const W = 846, H = 320;
const CARD = { x: 500, w: 298, h: 96, gap: 24, pad: 24, title: 30, meta: 20 };
const cardsTop = (H - (2 * CARD.h + CARD.gap)) / 2;
const cardY = (i) => cardsTop + i * (CARD.h + CARD.gap);
const mid = (i) => cardY(i) + CARD.h / 2;

const CARDS = [
  { title: 'ccdeck', meta: '$ npx ccdeck', mark: true, accent: true },
  { title: 'C# and .NET', meta: 'Backend, at work' },
];

function banner(theme) {
  const c = THEMES[theme];
  const parts = [];

  // Plate and the canvas's dot grid.
  parts.push(`<defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="${c.dot}"/></pattern>`
    + CARDS.map((_, i) => `<clipPath id="card${i}"><rect x="${CARD.x}" y="${cardY(i)}" width="${CARD.w}" height="${CARD.h}" rx="10"/></clipPath>`).join('')
    + `</defs>`);
  parts.push(`<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="${c.plate}" stroke="${c.plateLine}"/>`);
  parts.push(`<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="15.5" fill="url(#dots)"/>`);

  // The name is the tree's root: "Bargan" sits on the axis the two cards fork from.
  const L = 48, size = 76, rootY = (mid(0) + mid(1)) / 2;
  const b2 = Math.round(rootY + (F.display.xHeight / 1000) * size / 2), b1 = b2 - 78;
  parts.push(text(F.display, 'Constantin', size, L, b1, c.ink, -0.034));
  parts.push(text(F.display, 'Bargan', size, L, b2, c.ink, -0.034));
  // It shares a baseline with the last card's meta line.
  parts.push(text(F.body, 'Software engineer in Chișinău.', 28, L + 2, cardY(1) + 74, c.ink2, -0.005));

  // Orthogonal step edges, the way the deck draws a session's subagents. ccdeck's branch is the one accent.
  const portX = Math.round(L + width(F.display, 'Bargan', size, -0.034) + 26), busX = CARD.x - 28;
  parts.push(`<g fill="none" stroke-width="1.5">`
    + `<path stroke="${c.edge}" d="M${portX + 4} ${rootY}H${busX}V${mid(1)}H${CARD.x}"/>`
    + `<path stroke="${c.accent}" stroke-dasharray="4 4" d="M${busX} ${rootY}V${mid(0)}H${CARD.x}"/>`
    + `</g>`);
  parts.push(`<circle cx="${portX}" cy="${rootY}" r="4" fill="none" stroke="${c.edge}" stroke-width="1.5"/>`);

  CARDS.forEach((k, i) => {
    const y = cardY(i), x = CARD.x;
    parts.push(`<rect x="${x + .5}" y="${y + .5}" width="${CARD.w - 1}" height="${CARD.h - 1}" rx="9.5" fill="${c.card}" stroke="${c.cardLine}"/>`);
    parts.push(`<rect x="${x}" y="${y}" width="3" height="${CARD.h}" fill="${k.accent ? c.accent : c.edge}" clip-path="url(#card${i})"/>`);
    const titleY = y + 42;
    let tx = x + CARD.pad;
    if (k.mark) {
      // Kit pattern for product chrome: the small-optical mark (height a multiple of 4), then the name at 600.
      const mh = 28, s = mh / 96;
      const capMid = titleY - (F.title.capHeight / 1000) * CARD.title / 2;
      parts.push(`<g transform="translate(${tx} ${r1(capMid - mh / 2)}) scale(${Math.round(s * 10000) / 10000})">${MARK[theme]}</g>`);
      tx += 112 * s + 10;
    }
    parts.push(text(F.title, k.title, CARD.title, tx, titleY, c.ink, -0.012));
    parts.push(k.meta.startsWith('$')
      ? text(F.mono, k.meta, CARD.meta, x + CARD.pad, y + 74, c.ink3)
      : text(F.body, k.meta, CARD.meta, x + CARD.pad, y + 74, c.ink3));
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">`
    + `<title>${TITLE}</title>` + parts.join('') + `</svg>\n`;
}

for (const theme of ['dark', 'light']) {
  const svg = banner(theme);
  writeFileSync(join(out, `banner-${theme}.svg`), svg);
  console.log(`assets/banner-${theme}.svg`, svg.length, 'bytes');
}
