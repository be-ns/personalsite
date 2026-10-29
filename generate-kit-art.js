// Kit art generator: the engraved and stippled illustrations in kit.html.
//
// Each drawing is an SVG <symbol> the page reuses with <use>, cropped with
// viewBox where it needs a detail: the cover still life (marigolds and
// hanging amaranth in a stoneware jar, from Ben's palette photo), a street of
// apartment buildings with one orange-lit window, a single marigold, and the
// small plates (California poppies, a watering can, a balance, a candle, a
// trowel) the Workshop tools and Consulting use on their share cards
// (generate-og-images.js). Every drawing comes from a seeded random
// generator, so the output is the same on every run and on every machine.
//
// This file is a library: build-pages.js stamps the symbols each page names
// into that page's chrome:art region, so a page carries only the drawings it
// uses. Run `npm run pages` (or `npm run generate-art`) after changing a
// drawing; `node build-pages.js --check` exits non-zero when a page is stale.
//
// Size discipline: integer coordinates, relative path commands, hatching done
// with masks (one pattern per direction, so a window is one rectangle, not six
// lines), seed nodules and stipple as zero-length round-capped strokes. Colours
// are the palette in theme.json; line work that must follow the edition uses
// currentColor.


function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const i0 = (n) => Math.round(n).toString();
const TAU = Math.PI * 2;

const C = {
  char: '#1F1B1A', news: '#EFE8DC',
  o0: '#B9381A', o1: '#DD4A23', o2: '#FE5F35', o3: '#FF7A48', o4: '#FF9A5C',
  g0: '#525C26', g1: '#727E36', g2: '#9AA54E', g3: '#CAD576', g4: '#DFE6A2',
};

// Compact dot list: "M12 40h0M14 44h0" (relative moves would be shorter but
// these compress well and stay readable).
const dot = (x, y) => `M${i0(x)} ${i0(y)}h0`;

// ======================= COVER: still life =======================
// Marigolds (Tagetes erecta) and hanging amaranth in a stoneware jar, after
// Ben's bouquet photo. A marigold head is a dome of frilled petals placed on
// an ellipsoid and projected, so heads can face the viewer, turn three
// quarters or stand in profile on their green calyx. Amaranth is a knobbly
// rope: a tapering body with round nodules along both edges, seed clusters
// stippled inside and the shaded half hatched.

// Head palettes: five tones from shadow to highlight, Toxic Orange to a
// deeper marigold. The darkest two also fill the crevices under the petals.
const HEADS = {
  toxic: ['#A8341A', '#D84722', C.o2, '#FF7634', '#FF9140'],
  ember: ['#AE3E16', '#DC5420', '#F86A28', '#FF8436', '#FF9F48'],
  gold: ['#B04A12', '#DC6418', '#F47E1E', '#FF9532', '#FFAD4C'],
};

function stillLife() {
  const R = rng(20261027);
  ropeIds = 0;
  const W = 600, H = 760;
  const out = [];
  out.push(`<rect width="${W}" height="${H}" fill="url(#art-murk)"/>`);
  // silt: light specks, denser low down
  const sp = [];
  for (let i = 0; i < 900; i++) {
    const x = R() * W, y = R() * H;
    if (R() < 0.15 + 0.85 * (y / H) ** 1.5) sp.push(dot(x, y));
  }
  out.push(`<path d="${sp.join('')}" stroke="#7A6A5C" stroke-width="1.7" stroke-linecap="round" opacity=".5"/>`);
  // table edge and scratchboard grain of the table top
  out.push(`<rect y="676" width="${W}" height="${H - 676}" fill="${C.news}" mask="url(#art-m-h3)" opacity=".18"/>`);
  out.push(`<path d="M0 676H${W}" stroke="${C.news}" stroke-width="1.4" opacity=".4"/>`);

  // upright amaranth spikes behind the bouquet: they rise, arch outward and
  // nod a little at the tip. [x, y, dx, top, th, colour]
  for (const [x, y, dx, top, th, k] of [[170, 480, -112, 46, 13, 'olive'], [120, 520, -84, 170, 11, 'deep'], [430, 480, 116, 36, 13, 'olive'], [490, 520, 80, 160, 11, 'deep']]) {
    const curve = bez([x, y], [x + dx * 0.05, y - (y - top) * 0.55], [x + dx * 0.6, top - 26], [x + dx, top + 8]);
    out.push(rope(R, curve, th, 0.85, AMA[k]));
  }

  // heads: [x, y, r, pitch, roll, palette]. Pitch 0 faces the viewer; at
  // about 1.2 the head stands in profile on its calyx. Roll turns the axis.
  const heads = [
    [290, 70, 38, 1.05, -0.2, 'gold'], [414, 92, 52, 0.7, 0.35, 'toxic'], [168, 144, 42, 0.95, -0.6, 'ember'],
    [524, 198, 44, 1.15, 0.8, 'gold'], [330, 198, 68, 0.3, 0.1, 'toxic'], [86, 262, 40, 1.1, -0.9, 'toxic'],
    [198, 284, 60, 0.45, -0.35, 'gold'], [462, 304, 58, 0.5, 0.45, 'ember'],
    [316, 354, 76, 0.15, -0.05, 'toxic'], [122, 396, 48, 0.8, -0.7, 'ember'], [542, 402, 36, 1.2, 1.05, 'toxic'],
    [214, 448, 52, 0.6, -0.3, 'toxic'], [430, 450, 60, 0.55, 0.4, 'gold'],
  ];
  // buds on long stems in the gaps and at the edges: [x, y, r, angle, open]
  const buds = [[230, 36, 11, -0.25, 1], [482, 34, 10, 0.4, 0], [584, 294, 10, 1.2, 1], [28, 336, 10, -1.3, 0], [258, 190, 9, -0.1, 0], [578, 480, 9, 1.4, 0], [34, 476, 10, -1.4, 1], [108, 72, 9, -0.6, 0], [394, 262, 9, 0.3, 1], [520, 110, 9, 0.7, 1]];

  // stems first, all running back to the jar mouth
  let stems = '';
  for (const [x, y, r, p, q] of heads) {
    const [ax, ay] = [x - Math.sin(p) * Math.sin(q) * r * 1.2, y + Math.sin(p) * Math.cos(q) * r * 1.2];
    const jx = 300 + (x - 300) * 0.25;
    stems += `M${i0(ax)} ${i0(ay)}Q${i0((ax + jx) / 2 + (x - 300) * 0.2)} ${i0((ay + 486) / 2)} ${i0(jx)} 492`;
  }
  for (const [x, y, r, a] of buds) {
    const jx = 300 + (x - 300) * 0.2;
    stems += `M${i0(x - Math.sin(a) * r * 2)} ${i0(y + Math.cos(a) * r * 2)}Q${i0(x + (jx - x) * 0.2 - Math.sin(a) * 60)} ${i0(y + (486 - y) * 0.5)} ${i0(jx)} 492`;
  }
  out.push(`<path d="${stems}" fill="none" stroke="${C.char}" stroke-width="5.4"/><path d="${stems}" fill="none" stroke="${C.g1}" stroke-width="3"/>`);

  // marigold foliage, pinnate and dark, so the heads sit apart
  for (const [a, l, x, y] of [[-2.55, 250, 290, 470], [-0.6, 260, 310, 470], [-2.0, 280, 290, 470], [-1.05, 300, 310, 470], [-3.05, 230, 280, 480], [-0.1, 230, 320, 480], [-1.55, 230, 300, 470], [-2.8, 160, 250, 380], [-0.35, 160, 350, 380], [-1.3, 200, 330, 300], [-1.9, 190, 270, 300]]) {
    out.push(fern(R, x, y, a, l));
  }
  for (const [x, y, r, a, open] of buds) out.push(bud(R, x, y, r, a, open));
  for (const [x, y, r, p, q, pal] of heads) out.push(marigold(R, x, y, r, p, q, HEADS[pal]));

  out.push(jar(R, 300, 486));

  // hanging amaranth: up over the lip, a slow curve outward, then down in
  // front of the jar; two more spill from the bunch over the lower heads.
  // [x, y, side, reach, len, th, colour]
  for (const [x, y, side, reach, len, th, k] of [
    [148, 432, -1, 46, 240, 11, 'deep'], [476, 444, 1, 40, 200, 10, 'deep'],
    [192, 484, -1, 44, 210, 10, 'deep'], [212, 486, -1, 30, 276, 13, 'pale'], [234, 490, -1, 12, 330, 14, 'pale'], [256, 496, -1, -4, 236, 10, 'deep'],
    [404, 484, 1, 40, 150, 10, 'pale'], [384, 488, 1, 24, 228, 11, 'deep'], [362, 494, 1, 8, 296, 13, 'pale'],
  ]) {
    const end = [x + side * reach, y + len];
    const sway = (R() - 0.5) * 14;
    const curve = bez([x, y], [x + side * 28, y - 20], [end[0] + side * 6 + sway, y + len * 0.3], end);
    if (len > 290) {
      // a side branch leaves the rope near the top and hangs beside it
      const bx = x + side * 18, by = y - 4;
      out.push(rope(R, bez([bx, by], [bx + side * 30, by - 14], [end[0] + side * 34, by + len * 0.25], [end[0] + side * 30, by + len * 0.55]), th * 0.6, 0.9, AMA[k === 'pale' ? 'deep' : 'pale']));
    }
    out.push(rope(R, curve, th, 0.8, AMA[k]));
  }
  return { W, H, body: out.join('') };
}

// ---- small vector helpers
const v3 = {
  add: (...vs) => vs.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]),
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
const LIGHT = v3.norm([-0.5, -0.65, 0.6]);

// Compact path from absolute points: first point absolute, the rest relative
// to the rounded previous end point, so rounding never drifts.
function nums(list) {
  let s = '';
  list.forEach((v, i) => { s += (i && v >= 0 ? ' ' : '') + v; });
  return s;
}
function relPath(start, segs, close = true) {
  let px = Math.round(start[0]), py = Math.round(start[1]);
  let d = `M${nums([px, py])}`;
  for (const [cmd, ...pts] of segs) {
    const r = pts.map(([x, y]) => [Math.round(x) - px, Math.round(y) - py]);
    d += cmd + nums(r.flat());
    const [ex, ey] = pts[pts.length - 1];
    px = Math.round(ex); py = Math.round(ey);
  }
  return close ? `${d}z` : d;
}

// One marigold head in a local frame of radius 100, scaled to r.
function marigold(R, cx, cy, r, pitch, roll, pal, n = r < 50 ? 80 : 100) {
  const A = [Math.sin(pitch) * Math.sin(roll), -Math.sin(pitch) * Math.cos(roll), Math.cos(pitch)];
  const U = [Math.cos(roll), Math.sin(roll), 0];
  const V = v3.cross(A, U);
  const h = 0.78;
  const thMax = 1.95 - 0.25 * Math.sin(pitch);
  const cMin = Math.cos(thMax);
  const petals = [];
  // a golden-angle spiral over the dome, then a crumpled tuft on the crown
  const spots = [];
  for (let i = 0; i < n; i++) spots.push([1 - (1 - cMin) * Math.min(1, (i + R() * 0.9) / n), i * 2.39996 + (R() - 0.5) * 0.6]);
  for (let i = 0; i < 9; i++) spots.push([Math.cos(0.12 + R() * 0.42), R() * TAU]);
  for (const [c, ps] of spots) {
    const th = Math.acos(c), st = Math.sin(th);
    const radial = v3.add(v3.mul(U, Math.cos(ps)), v3.mul(V, Math.sin(ps)));
    const P = v3.add(v3.mul(radial, 100 * st), v3.mul(A, 100 * h * c));
    const N = v3.norm(v3.add(v3.mul(radial, st), v3.mul(A, c / h)));
    const T = v3.norm(v3.add(v3.mul(radial, c), v3.mul(A, -st * h)));
    const lift = 0.1 + 0.38 * (1 - th / thMax) + (R() - 0.5) * 0.3;
    let D = v3.norm(v3.add(v3.mul(T, Math.cos(lift)), v3.mul(N, Math.sin(lift))));
    let B = v3.norm(v3.cross(N, D));
    const tw = (R() - 0.5) * (0.5 + 1.6 * (1 - th / thMax));
    [D, B] = [v3.norm(v3.add(v3.mul(D, Math.cos(tw)), v3.mul(B, Math.sin(tw)))), v3.norm(v3.add(v3.mul(B, Math.cos(tw)), v3.mul(D, -Math.sin(tw))))];
    const L = (27 + 20 * (th / thMax)) * (0.85 + R() * 0.3);
    const Wd = L * (1.3 + R() * 0.35);
    let Np = v3.cross(D, B);
    const back = Np[2] < 0;
    if (back) Np = v3.mul(Np, -1);
    const tipZ = v3.add(P, v3.mul(D, L))[2];
    const tip2 = [P[0] + D[0] * L, P[1] + D[1] * L];
    // a petal facing away and lying inside the silhouette is never seen
    if (N[2] < 0.05 && Math.hypot(...tip2) < 96 && Math.hypot(P[0], P[1]) < 96) continue;
    const at = (u, out, nz = 0) => {
      const p = v3.add(P, v3.mul(D, L * out), v3.mul(B, Wd * (u - 0.5)), v3.mul(N, nz));
      return [p[0], p[1]];
    };
    // a rounded fan whose edge rolls in three ruffles of uneven size
    const lobes = 3;
    const segs = [['q', at(-0.14, 0.28), at(0.02, 0.66)]];
    let u0 = 0.02;
    for (let k = 0; k < lobes; k++) {
      const u1 = k === lobes - 1 ? 0.98 : u0 + (0.98 - u0) / (lobes - k) * (0.7 + R() * 0.6);
      const um = (u0 + u1) / 2;
      const rise = (u) => 0.66 + 0.34 * Math.sin(Math.PI * u);
      segs.push(['q', at(um, rise(um) + 0.3 + R() * 0.18, (R() - 0.5) * L * 0.5), at(u1, rise(u1) - (k < lobes - 1 ? 0.06 + R() * 0.1 : 0))]);
      u0 = u1;
    }
    segs.push(['q', at(1.14, 0.28), at(0.5, -0.12)]);
    const shade = v3.dot(Np, LIGHT);
    let tone = Math.round(1.0 + shade * 2.8 + (R() - 0.5) * 0.9) - (back ? 1 : 0) - (th > 1.55 ? 1 : 0);
    tone = Math.max(0, Math.min(4, tone));
    petals.push({ z: (P[2] + tipZ) / 2, tone, d: relPath(at(0.5, -0.12), segs) });
  }
  petals.sort((a, b) => a.z - b.z);
  const s = r / 100;
  let o = `<g transform="translate(${i0(cx)} ${i0(cy)}) scale(${s.toFixed(3)})" stroke="${C.char}" stroke-width="1.7" stroke-linejoin="round">`;
  // calyx: a ribbed green cup under the dome, seen when the head turns
  const a2 = Math.hypot(A[0], A[1]);
  if (a2 > 0.3) {
    const dx = -A[0] / a2, dy = -A[1] / a2, px = -dy, py = dx;
    const t0 = 34, t1 = 56 + 90 * a2, w0 = 56, w1 = 15;
    const p = (t, w) => [dx * t + px * w, dy * t + py * w];
    const cal = relPath(p(t0, -w0), [['c', p(t0 + 30, -w0 * 1.02), p(t1 - 22, -w1 * 1.4), p(t1, -w1)], ['l', p(t1 + 4, 0)], ['l', p(t1, w1)], ['c', p(t1 - 22, w1 * 1.4), p(t0 + 30, w0 * 1.02), p(t0, w0)]]);
    let ribs = '';
    for (const f of [-0.62, -0.22, 0.2, 0.6]) ribs += relPath(p(t0 + 10, w0 * f), [['q', p((t0 + t1) / 2 + 6, w0 * f * 0.9), p(t1 - 2, w1 * f)]], false);
    let teeth = '';
    for (const f of [-0.85, -0.4, 0.05, 0.5, 0.9]) teeth += relPath(p(t0 + 6, w0 * (f - 0.16)), [['l', p(t0 - 22, w0 * f)], ['l', p(t0 + 6, w0 * (f + 0.16))]]);
    o += `<path d="${cal}${teeth}" fill="${C.g1}" stroke-width="2.4"/><path d="${ribs}" fill="none" stroke="${C.g0}" stroke-width="3"/>`;
  }
  // crevice ground and a cast shadow so overlapping heads separate
  o += `<ellipse cx="6" cy="10" rx="98" ry="${i0(98 * (0.82 + 0.18 * Math.abs(A[2])))}" fill="${C.char}" opacity=".5" stroke="none"/>`;
  o += `<ellipse rx="86" ry="${i0(86 * (0.78 + 0.22 * Math.abs(A[2])))}" transform="translate(${i0(A[0] * 30)} ${i0(A[1] * 30)})" fill="${pal[0]}" stroke="none"/>`;
  o += `<circle cx="${i0(A[0] * 70)}" cy="${i0(A[1] * 70)}" r="40" fill="${pal[1]}" stroke="none"/>`;
  // Petals go back to front in depth bands, one path per tone in a band.
  // Within one path every outline is painted over every fill, so petals that
  // overlap must not share a path. Depth bands keep that rare; the topmost
  // petals, which pile up on the crown, each get a path of their own.
  const top = petals.length - 8;
  for (let b = 0; b < top; b += 12) {
    const byTone = [[], [], [], [], []];
    for (const pt of petals.slice(b, Math.min(top, b + 12))) byTone[pt.tone].push(pt.d);
    byTone.forEach((ds, t) => { if (ds.length) o += `<path fill="${pal[t]}" d="${ds.join('')}"/>`; });
  }
  for (const pt of petals.slice(Math.max(0, top))) o += `<path fill="${pal[pt.tone]}" d="${pt.d}"/>`;
  // engraved shade: diagonal hatching over the side away from the light, a
  // crescent cut from the disc by the same disc moved toward the light
  const rr = r * 0.9, ox = -0.4 * rr, oy = -0.5 * rr, dd = Math.hypot(ox, oy);
  const hh = Math.sqrt(rr * rr - (dd / 2) ** 2), nx = -oy / dd, ny = ox / dd;
  const mx = cx + ox / 2, my = cy + oy / 2;
  const q = (v) => (Math.round(v * 2) / 2).toString();
  o += `</g><path d="M${q(mx + nx * hh)} ${q(my + ny * hh)}A${q(rr)} ${q(rr)} 0 1 1 ${q(mx - nx * hh)} ${q(my - ny * hh)}A${q(rr)} ${q(rr)} 0 0 0 ${q(mx + nx * hh)} ${q(my + ny * hh)}z" fill="${C.char}" mask="url(#art-m-d)" opacity=".4"/>`;
  return o;
}

// A marigold bud: a ribbed green ovoid with pointed sepals, sometimes split
// open on an orange tuft.
function bud(R, x, y, r, ang, open) {
  const s = r / 10;
  let o = `<g transform="translate(${i0(x)} ${i0(y)}) rotate(${i0(ang * 57.3)}) scale(${s.toFixed(2)})" stroke="${C.char}" stroke-linejoin="round">`;
  if (open) o += `<path d="M-6-8q-3-6 1-9q1-5 5-3q4-4 6 1q4 1 1 6l-7 9z" fill="${C.o2}" stroke-width="1"/><path d="M-3-12l3 6M3-14l-1 7" fill="none" stroke-width=".8"/>`;
  o += `<path d="M-7-9q-2 10 2 20q5 4 10 0q4-10 2-20l-3 3l-2-6l-2 5l-3-5l-2 6z" fill="${C.g1}" stroke-width="1.1"/>`;
  o += `<path d="M-3-5q-1 8 1 15M2-5q1 8 0 15" fill="none" stroke="${C.g0}" stroke-width="1"/>`;
  return `${o}</g>`;
}

// ---- amaranth
const AMA = {
  pale: { body: C.g3, hi: C.g4, sh: C.g2 },
  deep: { body: C.g1, hi: C.g2, sh: C.g0 },
  olive: { body: C.g2, hi: C.g3, sh: C.g1 },
};

function bez(p0, p1, p2, p3) {
  return (t) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  };
}

// A tapering rope of seed clusters along a curve. The body is one smooth
// shape; round nodules ride along both edges and give it a knobbly outline.
// Nodules of one size share one path, drawn through <use> twice: their dark
// rims go under the body, their fills over it, so the outline is all bumps
// and the inside stays one mass (no string of beads). Light nodules and dark
// seed stipple the surface.
let ropeIds = 0;
function rope(R, curve, th, taper, pal) {
  const fine = [];
  for (let i = 0; i <= 160; i++) fine.push(curve(i / 160));
  const acc = [0];
  for (let i = 1; i < fine.length; i++) acc.push(acc[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
  const len = acc[acc.length - 1];
  let j = 0;
  const at = (d) => {
    if (d < acc[j]) j = 0;
    while (j < acc.length - 2 && acc[j + 1] < d) j++;
    const f = Math.min(1, (d - acc[j]) / ((acc[j + 1] - acc[j]) || 1));
    const [x0, y0] = fine[j], [x1, y1] = fine[j + 1];
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, -(y1 - y0) / l, (x1 - x0) / l];
  };
  // half-width along the rope: taper, swellings where clusters bunch, a tip
  let lump = 1, target = 1, lastD = -99;
  const width = (d) => {
    const t = d / len;
    if (d - lastD > th * 1.1) { target = 0.62 + R() * 0.6; lastD = d; }
    lump += (target - lump) * 0.35;
    return th * Math.max(0.18, 1 - taper * t ** 1.15) * lump * (t > 0.9 ? Math.max(0.25, (1 - t) / 0.1) : 1);
  };
  const SIZES = [1.5, 2.5, 4];
  const cls = SIZES.map(() => []);
  const hi = [], sh = [], left = [], right = [], shade = [], spine = [];
  for (let d = 0; d < len;) {
    const w = width(d);
    const [x, y, nx, ny] = at(d);
    left.push([x + nx * w * 0.8, y + ny * w * 0.8]);
    right.push([x - nx * w * 0.8, y - ny * w * 0.8]);
    const k = w * 0.4 < 2 ? 0 : w * 0.4 < 3.2 ? 1 : 2;
    const dr = SIZES[k];
    for (const sgn of [1, -1]) {
      const u = sgn * (0.8 + (R() - 0.5) * 0.25) * w;
      cls[k].push([x + nx * u + (R() - 0.5) * dr * 0.6, y + ny * u + (R() - 0.5) * dr * 0.6]);
    }
    // the shaded half, for the engraved hatch
    const sg = nx * 0.6 + ny * 0.8 > 0 ? 1 : -1;
    shade.push([x + nx * sg * w * 0.95, y + ny * sg * w * 0.95]);
    spine.push([x - nx * sg * w * 0.1, y - ny * sg * w * 0.1]);
    // seed clusters inside: each a dark seed with a light bump up and left
    if (w > th * 0.42) {
      for (let q = 0; q < 1 + (w > 6); q++) {
        const u = (R() * 1.4 - 0.7) * w;
        const bx = x + nx * u, by = y + ny * u, bs = th * 0.17;
        sh.push([bx + bs * 0.7, by + bs * 0.8]);
        if (u * sg < 0.35 * w) hi.push([bx - bs * 0.3, by - bs * 0.35]);
      }
    }
    d += Math.max(2.6, dr * 1.5);
  }
  const dots = (list) => {
    let s = '', px = null, py = null;
    for (const [x0, y0] of list) {
      const x = Math.round(x0), y = Math.round(y0);
      s += px === null ? `M${x} ${y}h0` : `m${nums([x - px, y - py])}h0`;
      px = x; py = y;
    }
    return s;
  };
  const poly = (list) => {
    let s = '', px = null, py = null;
    for (let i = 0; i < list.length; i += 2) {
      const x = Math.round(list[i][0]), y = Math.round(list[i][1]);
      s += px === null ? `M${x} ${y}l` : `${nums([x - px, y - py])} `;
      px = x; py = y;
    }
    return s.trim();
  };
  const tip = at(len);
  const body = `${poly(left)} ${nums([Math.round(tip[0]) - Math.round(left[left.length - 1 - ((left.length - 1) % 2)][0]), Math.round(tip[1]) - Math.round(left[left.length - 1 - ((left.length - 1) % 2)][1])])}`;
  const back = right.slice().reverse();
  let bodyD = body, px = Math.round(tip[0]), py = Math.round(tip[1]);
  for (let i = 0; i < back.length; i += 2) {
    const x = Math.round(back[i][0]), y = Math.round(back[i][1]);
    bodyD += ` ${nums([x - px, y - py])}`;
    px = x; py = y;
  }
  const id = `art-n${ropeIds++}`;
  let defs = '', rims = '', fills = '';
  cls.forEach((list, k) => {
    if (!list.length) return;
    defs += `<path id="${id}-${k}" d="${dots(list)}"/>`;
    rims += `<use href="#${id}-${k}" stroke="${C.char}" stroke-width="${(SIZES[k] * 2 + 1.8).toFixed(1)}"/>`;
    fills += `<use href="#${id}-${k}" stroke="${pal.body}" stroke-width="${SIZES[k] * 2}"/>`;
  });
  const hatch = `${poly([...shade, ...spine.reverse()])}z`;
  return `<defs>${defs}</defs><g stroke-linecap="round">${rims}<path d="${bodyD}z" fill="${pal.body}" stroke="${pal.body}" stroke-width="1.2"/>${fills}` +
    `<path d="${hatch}" fill="${C.char}" mask="url(#art-m-d)" opacity=".3"/>` +
    `<path d="${dots(sh)}" stroke="${pal.sh}" stroke-width="${Math.max(2.2, th * 0.36).toFixed(1)}"/><path d="${dots(hi)}" stroke="${pal.hi}" stroke-width="${Math.max(1.8, th * 0.3).toFixed(1)}"/></g>`;
}

function fern(R, x0, y0, ang, len) {
  const leaflets = { a: [], b: [] };
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (t) => { const bend = Math.sin(t * 2.4) * 14; return [x0 + ca * len * t - sa * bend, y0 + sa * len * t + ca * bend]; };
  let rach = `M${i0(x0)} ${i0(y0)}`;
  for (let i = 1; i <= 10; i++) { const [x, y] = P(i / 10); rach += `L${i0(x)} ${i0(y)}`; }
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t = 0.32 + 0.68 * (i / steps);
    const [px, py] = P(t);
    const l = 34 * (1 - 0.55 * (i / steps)) + R() * 6;
    for (const s of [-1, 1]) {
      const a2 = ang + s * (0.9 - 0.3 * (i / steps));
      const tx = px + Math.cos(a2) * l, ty = py + Math.sin(a2) * l;
      const nx = -Math.sin(a2) * l * 0.2, ny = Math.cos(a2) * l * 0.2;
      const mx = (px + tx) / 2, my = (py + ty) / 2;
      (R() < 0.5 ? leaflets.a : leaflets.b).push(`M${i0(px)} ${i0(py)}Q${i0(mx + nx)} ${i0(my + ny)} ${i0(tx)} ${i0(ty)}Q${i0(mx - nx)} ${i0(my - ny)} ${i0(px)} ${i0(py)}`);
    }
  }
  return `<path d="${rach}" fill="none" stroke="${C.g1}" stroke-width="2.4"/>` +
    `<path d="${leaflets.a.join('')}" fill="${C.g1}" stroke="${C.char}" stroke-width=".7"/>` +
    `<path d="${leaflets.b.join('')}" fill="${C.g0}" stroke="${C.char}" stroke-width=".7"/>`;
}

function jar(R, cx, top) {
  const neck = 72, shoulder = 122, base = 88, h = 214;
  const y0 = top, y1 = top + 24, y2 = top + 86, y3 = top + h;
  const d = `M${cx - neck} ${y0}C${cx - neck} ${y1} ${cx - shoulder - 10} ${y1 + 10} ${cx - shoulder} ${y2}` +
    `C${cx - shoulder + 6} ${y2 + 66} ${cx - base - 8} ${y3 - 40} ${cx - base} ${y3}H${cx + base}` +
    `C${cx + base + 8} ${y3 - 40} ${cx + shoulder - 6} ${y2 + 66} ${cx + shoulder} ${y2}` +
    `C${cx + shoulder + 10} ${y1 + 10} ${cx + neck} ${y1} ${cx + neck} ${y0}Z`;
  let out = `<path d="${d}" fill="#221E1D" stroke="${C.char}" stroke-width="2"/>`;
  // engraved light: contour lines across the lit left half
  let hatch = '';
  for (let y = y0 + 8; y < y3 - 4; y += 3.6) {
    const k = (y - y0) / h;
    const wHalf = k < 0.4 ? neck + (shoulder - neck) * Math.sin((k / 0.4) * Math.PI / 2) : shoulder - (shoulder - base) * ((k - 0.4) / 0.6) ** 1.4;
    const x0 = cx - wHalf + 4;
    const len = wHalf * (0.7 + 0.25 * Math.sin(y / 9)) * (0.6 + R() * 0.25);
    hatch += `M${i0(x0)} ${y.toFixed(1)}q${i0(len / 2)} ${(2 + k * 4).toFixed(1)} ${i0(len)} ${(1 + k * 3).toFixed(1)}`;
  }
  out += `<path d="${hatch}" fill="none" stroke="${C.news}" stroke-width=".9" opacity=".45"/>`;
  let glaze = '';
  for (let x = cx - shoulder + 8; x < cx + shoulder - 6; x += 12) glaze += dot(x, y2 + 16 + Math.sin(x / 18) * 2);
  out += `<path d="${glaze}" stroke="${C.o2}" stroke-width="5" stroke-linecap="round"/>`;
  out += `<ellipse cx="${cx}" cy="${y0}" rx="${neck}" ry="9" fill="#171413" stroke="${C.news}" stroke-opacity=".5"/>`;
  return out;
}

// ======================= STREET: monochrome engraving =======================
// Line work in currentColor: Newsprint on charcoal, Char on paper. Glass, side
// faces and roofs are filled shapes masked by a hatch pattern.
function building(R, x, w, h, G, opt = {}) {
  const top = G - h;
  const o = { line: [], glassH: [], glassD: [], side: [], roof: [], tone: [], spot: [], tick: [] };
  const side = opt.side ?? 12;
  o.line.push(`M${i0(x)} ${G}V${i0(top)}H${i0(x + w)}V${G}`);
  o.side.push(`M${i0(x + w)} ${i0(top)}l${side} ${-side / 2}V${G - side / 2}l${-side} ${side / 2}z`);
  if (opt.gable) {
    const peak = top - w * 0.42;
    o.roof.push(`M${i0(x - 6)} ${top + 2}L${i0(x + w / 2)} ${i0(peak)}L${i0(x + w + 6)} ${top + 2}z`);
    o.line.push(`M${i0(x - 6)} ${top + 2}L${i0(x + w / 2)} ${i0(peak)}L${i0(x + w + 6)} ${top + 2}`);
    o.line.push(`M${i0(x + w * 0.7)} ${i0(top - w * 0.2)}v-22h10v${i0(22 - w * 0.08)}`);
  } else {
    o.line.push(`M${i0(x - 3)} ${top}h${w + 6}M${i0(x - 3)} ${top + 5}h${w + 6}`);
    o.tick.push(`M${i0(x)} ${top + 5}h${w}`);
  }
  const floors = opt.floors ?? Math.max(2, Math.floor((h - 34) / 30));
  const cols = opt.cols ?? Math.max(2, Math.floor((w - 12) / 22));
  const fh = (h - 30) / floors, cw = (w - 12) / cols;
  const ww = Math.round(Math.min(cw * 0.55, 13)), wh = Math.round(fh * 0.58);
  const lit = opt.lit ?? [-1, -1];
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const wx = Math.round(x + 6 + c * cw + (cw - ww) / 2);
      const wy = Math.round(top + 12 + f * fh + (fh - wh) / 2);
      if (f === floors - 1 && c === Math.floor(cols / 2)) {
        o.line.push(`M${wx - 2} ${G}V${wy}h${ww + 4}V${G}`);
        o.glassD.push(`M${wx - 2} ${wy}h${ww + 4}V${G}h${-ww - 4}z`);
        continue;
      }
      const rect = `M${wx} ${wy}h${ww}v${wh}h${-ww}z`;
      o.line.push(rect);
      if (f === lit[0] && c === lit[1]) { o.spot.push(`M${wx + 1} ${wy + 1}h${ww - 2}v${wh - 2}h${-ww + 2}z`); continue; }
      if (R() < 0.8) (R() < 0.6 ? o.glassH : o.glassD).push(rect);
      if (opt.balconies && f < floors - 1) {
        o.line.push(`M${wx - 3} ${wy + wh + 3}h${ww + 6}`);
        o.tick.push(`M${wx - 3} ${wy + wh - 1}h${ww + 6}v4h${-ww - 6}z`);
      }
    }
  }
  if (opt.tone) {
    o.tone.push(`M${i0(x + 1)} ${top + 8}h${i0(w * 0.22)}V${G}h${i0(-w * 0.22)}z`);
    o.tone.push(`M${i0(x + w * 0.84)} ${top + 8}h${i0(w * 0.16)}V${G}h${i0(-w * 0.16)}z`);
  }
  return o;
}

function stippleTree(R, cx, G, r, hgt, n, dots, lines) {
  const cy = G - hgt;
  const lobes = [];
  for (let i = 0; i < 5; i++) lobes.push([cx + (R() - 0.5) * r, cy + (R() - 0.5) * r * 0.7, r * (0.55 + R() * 0.3)]);
  let placed = 0, guard = 0;
  while (placed < n && guard < n * 20) {
    guard++;
    const x = cx + (R() - 0.5) * r * 2.6, y = cy + (R() - 0.5) * r * 2.2;
    if (!lobes.some(([lx, ly, lr]) => (x - lx) ** 2 + (y - ly) ** 2 < lr * lr)) continue;
    const shade = 0.22 + 0.78 * Math.min(1, Math.max(0, ((x - cx) / r + (y - cy) / r + 1) / 2.4));
    if (R() > shade) continue;
    dots.push(dot(x, y));
    placed++;
  }
  lines.push(`M${cx - 2} ${G}C${cx - 1} ${i0(G - hgt * 0.4)} ${cx - 3} ${i0(cy + r * 0.3)} ${cx - 6} ${i0(cy)}`);
  lines.push(`M${cx + 2} ${G}C${cx + 2} ${i0(G - hgt * 0.4)} ${cx + 4} ${i0(cy + r * 0.3)} ${cx + 8} ${i0(cy - 4)}`);
}

function inkBody(parts, dots, sky) {
  const j = (k) => parts.flatMap((p) => p[k]).join('');
  return `<path d="${sky}" stroke="currentColor" stroke-width=".7" opacity=".6"/>` +
    `<path d="${j('side')}" fill="currentColor" mask="url(#art-m-v)"/>` +
    `<path d="${j('roof')}" fill="currentColor" mask="url(#art-m-d)"/>` +
    `<path d="${j('tone')}" fill="currentColor" mask="url(#art-m-h3)" opacity=".7"/>` +
    `<path d="${j('glassH')}" fill="currentColor" mask="url(#art-m-h)"/>` +
    `<path d="${j('glassD')}" fill="currentColor" mask="url(#art-m-d)"/>` +
    `<path d="${j('tick')}" fill="currentColor" mask="url(#art-m-v)"/>` +
    `<path d="${j('line')}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<path d="${dots.join('')}" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>` +
    `<path class="art-spot" d="${j('spot')}"/>`;
}

function street() {
  const R = rng(4417);
  const W = 1200, H = 280, G = 262;
  const parts = [
    building(R, 8, 140, 150, G, { tone: true }),
    building(R, 172, 150, 212, G, { balconies: true, lit: [2, 3] }),
    building(R, 420, 104, 112, G, { gable: true, floors: 2, cols: 3, tone: true }),
    building(R, 548, 210, 246, G, { balconies: true, tone: true }),
    building(R, 850, 132, 170, G, {}),
    building(R, 1010, 120, 120, G, { gable: true, floors: 2, cols: 3 }),
  ];
  const dots = [], lines = [];
  for (const [cx, r, h, n] of [[365, 34, 96, 520], [800, 30, 80, 420], [990, 22, 60, 220], [1166, 28, 74, 320]]) stippleTree(R, cx, G, r, h, n, dots, lines);
  lines.push(`M0 ${G}H${W}`);
  for (let i = 0; i < 520; i++) dots.push(dot(R() * W, G + 3 + (R() ** 1.6) * (H - G - 3)));
  parts.push({ line: lines, glassH: [], glassD: [], side: [], roof: [], tone: [], spot: [], tick: [] });
  let sky = '';
  for (let y = 12; y < 110; y += 7) sky += `M${i0(R() * W * 0.9)} ${y}h${i0(30 + R() * 140)}`;
  return { W, H, body: inkBody(parts, dots, sky) };
}

// ======================= PLATES: one small drawing a page =======================
// Small framed plates, drawn like the marigold: coloured fills under Char
// outlines, shade cut with the hatch masks, no ground of their own (the frame
// supplies it). One per Workshop tool and one for Consulting:
//   poppy    California poppies, the native plant (Native Plant Finder)
//   can      an orange watering can over a seedling (Life Strategy Matrix)
//   balance  a bronze balance, a marigold against two weights (Decision Assist)
//   candle   a taper in a stoneware holder, a marigold laid beside it
//            (the three memorial tools)
//   trowel   a trowel left in the dirt by a marigold seedling (Consulting)

// A stroke with a Char edge: the dark line first, the colour over it.
function inked(d, w, colour, extra = '') {
  return `<path d="${d}" fill="none" stroke="${C.char}" stroke-width="${(w + 1.8).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>` +
    `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
}
// A closed outline from absolute points, rounded to whole units.
function poly(pts, close = true) {
  return `M${pts.map(([x, y]) => `${i0(x)} ${i0(y)}`).join('L')}${close ? 'z' : ''}`;
}
// Rotate a point about an origin.
function rot([x, y], [ox, oy], a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c];
}
// Stipple: n dots inside a test, as one path.
function stipple(R, n, box, inside) {
  const [x0, y0, w, h] = box;
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 30) {
    const x = x0 + R() * w, y = y0 + R() * h;
    if (inside(x, y)) out.push(dot(x, y));
  }
  return out.join('');
}

// California poppy leaves: cut three ways, and three ways again, into narrow
// glaucous segments.
function poppyLeaf(R, x, y, ang, len, depth, list) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  const bend = (R() - 0.5) * len * 0.3;
  list.push(`M${i0(x)} ${i0(y)}Q${i0((x + ex) / 2 - Math.sin(ang) * bend)} ${i0((y + ey) / 2 + Math.cos(ang) * bend)} ${i0(ex)} ${i0(ey)}`);
  if (depth > 0) for (const da of [-0.62, 0.02, 0.6]) poppyLeaf(R, ex, ey, ang + da + (R() - 0.5) * 0.35, len * (0.5 + R() * 0.18), depth - 1, list);
}

// One petal of the cup: a fan from its base, its top edge in two soft lobes.
// Returns the outline and the vein lines.
function poppyPetal(R, bx, by, ang, len, w) {
  const at = (u, v) => rot([bx + u * w, by - v * len], [bx, by], ang);
  const lobe = 0.06 + R() * 0.05;
  const d = relPath(at(0, 0), [
    ['c', at(-0.12, 0.2), at(-0.56, 0.5), at(-0.5, 0.86)],
    ['q', at(-0.3, 1.04 + lobe), at(-0.02, 0.97)],
    ['q', at(0.26, 1.04 + lobe * 0.6), at(0.5, 0.88)],
    ['c', at(0.58, 0.5), at(0.12, 0.2), at(0, 0)],
  ]);
  const base = relPath(at(0, 0), [['c', at(-0.1, 0.1), at(-0.3, 0.28), at(-0.24, 0.42)], ['q', at(0, 0.5), at(0.24, 0.42)], ['c', at(0.3, 0.28), at(0.1, 0.1), at(0, 0)]]);
  let veins = '';
  for (let k = -3; k <= 3; k++) veins += relPath(at(k * 0.03, 0.08), [['q', at(k * 0.1, 0.5), at(k * 0.13 + (R() - 0.5) * 0.04, 0.8 + R() * 0.08)]], false);
  return { d, base, veins };
}

// An open poppy: the back petal shows its inside, the side and front petals
// their outsides, so the cup reads; stamens between, a green torus under it.
function poppyCup(R, cx, cy, r, tilt) {
  let o = `<g transform="rotate(${i0(tilt * 57.3)} ${i0(cx)} ${i0(cy)})" stroke="${C.char}" stroke-linejoin="round">`;
  const petals = [
    { a: 0, len: 1.08, w: 1.3, fill: C.o4, base: C.o1 },
    { a: -0.58, len: 1.0, w: 1.12, fill: C.o2, base: C.o0, shade: true },
    { a: 0.58, len: 1.0, w: 1.12, fill: C.o3, base: C.o1 },
  ];
  for (const p of petals) {
    const { d, base, veins } = poppyPetal(R, cx, cy, p.a, r * p.len, r * p.w);
    o += `<path d="${d}" fill="${p.fill}" stroke-width="1.6"/><path d="${base}" fill="${p.base}" stroke="none" opacity=".55"/>`;
    o += `<path d="${veins}" fill="none" stroke-width=".7" opacity=".35"/>`;
    if (p.shade) o += `<path d="${d}" fill="${C.char}" stroke="none" mask="url(#art-m-d)" opacity=".35"/>`;
  }
  // stamens, a crowded tuft of pale orange
  const st = [];
  for (let i = 0; i < 26; i++) { const a = R() * TAU, q = Math.sqrt(R()); st.push(dot(cx + Math.cos(a) * q * r * 0.3, cy - r * 0.42 + Math.sin(a) * q * r * 0.12)); }
  o += `<path d="${st.join('')}" stroke="${C.char}" stroke-width="4.6" stroke-linecap="round"/><path d="${st.join('')}" stroke="#FFAD4C" stroke-width="3" stroke-linecap="round"/>`;
  // the front petal, shorter, its rim dipped so the stamens show over it
  const f = poppyPetal(R, cx, cy, 0, r * 0.66, r * 1.34);
  o += `<path d="${f.d}" fill="${C.o2}" stroke-width="1.6"/><path d="${f.base}" fill="${C.o0}" stroke="none" opacity=".5"/><path d="${f.veins}" fill="none" stroke-width=".7" opacity=".35"/>`;
  o += `<path d="${f.d}" fill="${C.char}" stroke="none" mask="url(#art-m-h)" opacity=".22"/>`;
  // the torus: a flat green rim the petals stand on
  o += `<ellipse cx="${i0(cx)}" cy="${i0(cy + 2)}" rx="${i0(r * 0.24)}" ry="${i0(r * 0.08 + 1)}" fill="${C.g3}" stroke-width="1.4"/>`;
  return `${o}</g>`;
}

function poppy() {
  const R = rng(1769);
  const W = 200, H = 240;
  const out = [];
  // stems, smooth and blue-green, from one crown at the foot
  const crown = [104, 236];
  const heads = [[74, 92, 50, -0.2], [152, 124, 36, 0.32]];
  let stems = '';
  for (const [x, y] of heads) stems += `M${crown[0]} ${crown[1]}C${i0(crown[0] + (x - crown[0]) * 0.1)} ${i0(crown[1] - 60)} ${i0(x + (crown[0] - x) * 0.3)} ${i0(y + 60)} ${x} ${y + 4}`;
  stems += `M${crown[0]} ${crown[1]}C108 190 130 90 124 46`; // the bud
  stems += `M${crown[0]} ${crown[1]}C96 200 40 170 30 88`; // the seed pod's stem
  out.push(inked(stems, 2.6, C.g2));
  // basal leaves, cut fine
  const a = [], b = [];
  for (const [ang, len, x] of [[-2.7, 30, 100], [-2.25, 36, 102], [-1.85, 30, 104], [-1.25, 34, 106], [-0.8, 36, 106], [-0.4, 28, 108], [-1.55, 26, 104]]) poppyLeaf(R, x, 232, ang, len, 2, R() < 0.5 ? a : b);
  // a leaf up each flower stem
  poppyLeaf(R, 82, 150, -2.3, 22, 2, a);
  poppyLeaf(R, 132, 168, -0.55, 20, 2, b);
  for (const [list, col] of [[a, C.g2], [b, C.g1]]) out.push(inked(list.join(''), 2.1, col));
  // the seed pod: long, thin, ribbed, pointing up
  const pod = bez([30, 92], [26, 70], [24, 46], [30, 22]);
  const L = [], Rt = [], ribs = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, [x, y] = pod(t), w = 3.2 * (1 - t * 0.7);
    L.push([x - w, y]); Rt.push([x + w, y]);
  }
  out.push(`<path d="${poly([...L, ...Rt.reverse()])}" fill="${C.g1}" stroke="${C.char}" stroke-width="1.4" stroke-linejoin="round"/>`);
  for (const f of [-1, 1]) ribs.push(poly(Array.from({ length: 10 }, (_, i) => { const [x, y] = pod(0.05 + i * 0.09); return [x + f * 1.2, y]; }), false));
  out.push(`<path d="${ribs.join('')}" fill="none" stroke="${C.g0}" stroke-width=".9"/>`);
  // the bud, its pointed cap lifting off a furled orange twist
  out.push(`<g stroke="${C.char}" stroke-linejoin="round"><path d="M118 52c-4-8-2-18 5-24c6 6 8 16 4 24z" fill="${C.o2}" stroke-width="1.3"/><path d="M121 30l2 20M118 40c4-2 7 0 8 6" fill="none" stroke-width=".8" opacity=".6"/>` +
    `<path d="M124 30c-2-10 0-20 8-28c5 9 4 19-1 27z" fill="${C.g2}" stroke-width="1.3" transform="rotate(18 128 28)"/><path d="M129 6l-1 22" fill="none" stroke="${C.g0}" stroke-width=".9" transform="rotate(18 128 28)"/>` +
    `<ellipse cx="124" cy="53" rx="6" ry="2.4" fill="${C.g3}" stroke-width="1.2"/></g>`);
  // the flowers
  for (const [x, y, r, t] of heads) out.push(poppyCup(R, x, y, r, t));
  return { W, H, body: out.join('') };
}

// A watering can, painted Toxic Orange, its rose over a seedling.
function can() {
  const R = rng(3301);
  const W = 240, H = 200;
  const o = [];
  const G = 186;
  // ground: a scuff of dirt
  o.push(`<path d="${stipple(R, 140, [0, G - 2, W, 14], (x, y) => y > G + (R() ** 2) * 4 - 2)}" stroke="#7A6A5C" stroke-width="1.6" stroke-linecap="round"/>`);
  o.push(`<path d="M8 ${G}H232" stroke="${C.news}" stroke-width="1" opacity=".5"/>`);
  o.push(`<ellipse cx="108" cy="${G}" rx="60" ry="5" fill="${C.char}" opacity=".6"/>`);
  // the back handle and the arched top handle, behind the body
  o.push(inked('M58 86C34 90 30 140 58 150', 6, C.o1));
  o.push(inked('M66 70C70 26 136 18 150 66', 6.4, C.o2));
  // the spout: a tapering tube from low on the body up to the rose
  const s0 = [146, 156], s1 = [206, 70];
  const sp = (t, side) => { const x = s0[0] + (s1[0] - s0[0]) * t, y = s0[1] + (s1[1] - s0[1]) * t; const w = 7 - 3.6 * t; const n = [0.82, 0.57]; return [x + n[0] * w * side, y + n[1] * w * side]; };
  const spout = [sp(0, -1), sp(1, -1), sp(1, 1), sp(0, 1)];
  o.push(`<path d="${poly(spout)}" fill="${C.o2}" stroke="${C.char}" stroke-width="1.6" stroke-linejoin="round"/>`);
  o.push(`<path d="${poly([sp(0, 0.1), sp(1, 0.1), sp(1, 1), sp(0, 1)])}" fill="${C.char}" mask="url(#art-m-d)" opacity=".35"/>`);
  // the body: a drum with a domed shoulder
  const body = 'M60 76C60 70 150 70 150 76V172C150 180 60 180 60 172Z';
  o.push(`<path d="${body}" fill="${C.o2}" stroke="${C.char}" stroke-width="1.8" stroke-linejoin="round"/>`);
  o.push(`<path d="M118 76V176C132 176 150 176 150 172V76C150 74 140 72 118 72z" fill="${C.char}" mask="url(#art-m-d)" opacity=".38"/>`);
  o.push(`<path d="M134 74V178" stroke="${C.o0}" stroke-width="10" opacity=".5"/>`);
  o.push(`<path d="M72 80V170" stroke="${C.o4}" stroke-width="7" opacity=".8"/><path d="M84 80V170" stroke="${C.o3}" stroke-width="4" opacity=".8"/>`);
  // hoops and rivets
  for (const y of [92, 160]) o.push(`<path d="M60 ${y}C80 ${y + 4} 130 ${y + 4} 150 ${y}" fill="none" stroke="${C.char}" stroke-width="1.6"/><path d="M60 ${y + 4}C80 ${y + 8} 130 ${y + 8} 150 ${y + 4}" fill="none" stroke="${C.char}" stroke-width="1"/>`);
  let rv = '';
  for (let x = 66; x < 148; x += 10) rv += dot(x, 98 + Math.sin((x - 60) / 90 * Math.PI) * 3.2);
  o.push(`<path d="${rv}" stroke="${C.char}" stroke-width="2.2" stroke-linecap="round"/>`);
  // the filler mouth on the shoulder
  o.push(`<ellipse cx="105" cy="74" rx="44" ry="6" fill="${C.o1}" stroke="${C.char}" stroke-width="1.6"/><ellipse cx="96" cy="73" rx="18" ry="3" fill="${C.char}"/>`);
  // the rose: a dished cap across the spout's end, pierced
  const rc = [212, 64];
  o.push(`<g transform="rotate(-55 ${rc[0]} ${rc[1]})"><path d="M${rc[0] - 14} ${rc[1]}q14-10 28 0z" fill="${C.o1}" stroke="${C.char}" stroke-width="1.4"/><ellipse cx="${rc[0]}" cy="${rc[1]}" rx="14" ry="4.5" fill="${C.o3}" stroke="${C.char}" stroke-width="1.4"/>` +
    `<path d="M${rc[0] - 8} ${rc[1]}h0M${rc[0] - 3} ${rc[1] - 1}h0M${rc[0] + 3} ${rc[1] - 1}h0M${rc[0] + 8} ${rc[1]}h0M${rc[0]} ${rc[1] + 2}h0M${rc[0] - 5} ${rc[1] + 2}h0M${rc[0] + 5} ${rc[1] + 2}h0" stroke="${C.char}" stroke-width="1.6" stroke-linecap="round"/></g>`);
  // water: short strokes falling from the rose
  let rain = '';
  for (let i = 0; i < 26; i++) {
    const t = R(), x = 214 + (R() - 0.5) * 22 + t * 6, y = 74 + t * 96;
    rain += `M${i0(x)} ${i0(y)}l1 ${i0(5 + R() * 6)}`;
  }
  o.push(`<path d="${rain}" stroke="${C.g4}" stroke-width="1.4" stroke-linecap="round" opacity=".85"/>`);
  // the seedling the water is for
  o.push(inked('M220 186C220 176 219 170 221 160', 2, C.g2));
  o.push(`<g stroke="${C.char}" stroke-width="1.2" stroke-linejoin="round"><path d="M221 162c-4-8-14-10-20-6c4 8 14 10 20 6z" fill="${C.g3}"/><path d="M221 162c3-9 13-12 20-8c-3 8-13 11-20 8z" fill="${C.g2}"/></g>`);
  return { W, H, body: o.join('') };
}

// A bronze balance: a marigold on the low pan, two weights on the high one.
function balance() {
  const R = rng(5150);
  const W = 220, H = 220;
  const o = [];
  const P = [110, 62], tilt = -0.11, arm = 72;
  const L = rot([P[0] - arm, P[1]], P, tilt), Rr = rot([P[0] + arm, P[1]], P, tilt);
  const drop = 70;
  // chains first, behind the pans and the beam
  let ch = '';
  for (const [hx, hy] of [L, Rr]) for (const dx of [-29, 0, 29]) ch += `M${i0(hx)} ${i0(hy + 4)}L${i0(hx + dx)} ${i0(hy + drop)}`;
  o.push(`<path d="${ch}" stroke="${C.char}" stroke-width="2.6"/><path d="${ch}" stroke="${C.g3}" stroke-width="1" stroke-dasharray="2.5 1.5"/>`);
  // plinth and column
  o.push(`<path d="M56 214H164L156 204H64Z" fill="${C.g1}" stroke="${C.char}" stroke-width="1.6" stroke-linejoin="round"/><path d="M72 204H148L138 190H82Z" fill="${C.g2}" stroke="${C.char}" stroke-width="1.6" stroke-linejoin="round"/>`);
  o.push(`<path d="M114 204H156L164 214H122ZM120 190H138L148 204H126Z" fill="${C.char}" mask="url(#art-m-d)" opacity=".4"/>`);
  o.push(`<path d="M104 190V72H116V190Z" fill="${C.g2}" stroke="${C.char}" stroke-width="1.6"/><path d="M111 190V72H116V190Z" fill="${C.char}" mask="url(#art-m-v)" opacity=".45"/>`);
  for (const y of [176, 132, 92]) o.push(`<rect x="99" y="${y}" width="22" height="7" rx="2" fill="${C.g1}" stroke="${C.char}" stroke-width="1.4"/>`);
  // the beam, tipped toward the marigold
  const b = [[-arm - 4, -3.4], [arm + 4, -3.4], [arm + 4, 3.4], [-arm - 4, 3.4]].map(([x, y]) => rot([P[0] + x, P[1] + y], P, tilt));
  o.push(`<path d="${poly(b)}" fill="${C.g2}" stroke="${C.char}" stroke-width="1.6" stroke-linejoin="round"/>`);
  o.push(`<path d="${poly([b[0], b[1], b[2], b[3]].map((p, i) => (i < 2 ? rot([p[0], p[1] + 3.4], P, 0) : p)))}" fill="${C.char}" mask="url(#art-m-h)" opacity=".35"/>`);
  for (const [hx, hy] of [L, Rr]) o.push(`<circle cx="${i0(hx)}" cy="${i0(hy)}" r="4.5" fill="${C.g1}" stroke="${C.char}" stroke-width="1.4"/>`);
  // the pointer and the pivot
  const tip = rot([P[0], P[1] - 34], P, tilt);
  o.push(`<path d="M${P[0] - 3} ${P[1]}L${i0(tip[0])} ${i0(tip[1])}L${P[0] + 3} ${P[1]}z" fill="${C.g3}" stroke="${C.char}" stroke-width="1.2" stroke-linejoin="round"/><circle cx="${P[0]}" cy="${P[1]}" r="6" fill="${C.g1}" stroke="${C.char}" stroke-width="1.6"/><circle cx="${P[0]}" cy="${P[1]}" r="1.8" fill="${C.char}"/>`);
  // the pans
  const pan = (cx, cy) => `<path d="M${i0(cx - 32)} ${i0(cy)}C${i0(cx - 27)} ${i0(cy + 15)} ${i0(cx + 27)} ${i0(cy + 15)} ${i0(cx + 32)} ${i0(cy)}z" fill="${C.g1}" stroke="${C.char}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M${i0(cx)} ${i0(cy)}H${i0(cx + 32)}C${i0(cx + 27)} ${i0(cy + 15)} ${i0(cx + 8)} ${i0(cy + 12)} ${i0(cx)} ${i0(cy + 11)}z" fill="${C.char}" mask="url(#art-m-d)" opacity=".4"/>` +
    `<ellipse cx="${i0(cx)}" cy="${i0(cy)}" rx="32" ry="5.5" fill="${C.g2}" stroke="${C.char}" stroke-width="1.4"/>`;
  const lp = [L[0], L[1] + drop], rp = [Rr[0], Rr[1] + drop];
  o.push(pan(...rp));
  // two weights, the larger under the smaller
  for (const [w, h, y, x] of [[22, 14, rp[1] - 2, rp[0] - 6], [14, 10, rp[1] - 16, rp[0] - 6]]) {
    o.push(`<path d="M${i0(x - w / 2)} ${i0(y)}V${i0(y - h)}H${i0(x + w / 2)}V${i0(y)}C${i0(x + w / 2)} ${i0(y + 3)} ${i0(x - w / 2)} ${i0(y + 3)} ${i0(x - w / 2)} ${i0(y)}z" fill="${C.g1}" stroke="${C.char}" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<ellipse cx="${i0(x)}" cy="${i0(y - h)}" rx="${i0(w / 2)}" ry="2.6" fill="${C.g3}" stroke="${C.char}" stroke-width="1.2"/><path d="M${i0(x + w / 6)} ${i0(y - h + 2)}V${i0(y + 1)}" stroke="${C.char}" stroke-width="${i0(w / 3)}" mask="url(#art-m-v)" opacity=".45"/>`);
  }
  o.push(pan(...lp));
  o.push(marigold(R, lp[0] + 2, lp[1] - 16, 22, 0.5, -0.2, HEADS.toxic, 70));
  return { W, H, body: o.join('') };
}

// A taper in a stoneware holder, lit; a marigold laid beside it.
function candle() {
  const R = rng(1102);
  const W = 160, H = 240;
  const o = [];
  const fx = 80, fy = 46;
  // the halo: an engraver's rays round the flame
  let rays = '';
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU, r0 = 22 + (i % 2) * 6, r1 = r0 + 10 + (i % 3) * 7 + R() * 4;
    rays += `M${i0(fx + Math.cos(a) * r0)} ${i0(fy + Math.sin(a) * r0 * 1.15)}L${i0(fx + Math.cos(a) * r1)} ${i0(fy + Math.sin(a) * r1 * 1.15)}`;
  }
  o.push(`<circle cx="${fx}" cy="${fy}" r="46" fill="${C.o2}" opacity=".08"/><circle cx="${fx}" cy="${fy}" r="28" fill="${C.o3}" opacity=".1"/><path d="${rays}" stroke="${C.o3}" stroke-width=".9" opacity=".45"/>`);
  // the table
  o.push(`<rect y="222" width="${W}" height="18" fill="${C.news}" mask="url(#art-m-h3)" opacity=".18"/><path d="M0 222H${W}" stroke="${C.news}" stroke-width="1.2" opacity=".4"/>`);
  // the holder: a stoneware dish with a ring handle and a socket
  o.push(`<path d="M134 206c16-2 20 14 4 16" fill="none" stroke="${C.char}" stroke-width="6"/><path d="M134 206c16-2 20 14 4 16" fill="none" stroke="#3A3330" stroke-width="3"/>`);
  o.push(`<path d="M26 206C28 222 132 222 134 206Z" fill="#221E1D" stroke="${C.char}" stroke-width="1.6"/>`);
  o.push(`<ellipse cx="80" cy="206" rx="54" ry="10" fill="#2E2826" stroke="${C.news}" stroke-opacity=".5" stroke-width="1.2"/>`);
  let glaze = '';
  for (let x = 34; x < 128; x += 8) glaze += dot(x, 212 + Math.sin((x - 26) / 108 * Math.PI) * 5);
  o.push(`<path d="${glaze}" stroke="${C.o2}" stroke-width="3.4" stroke-linecap="round"/>`);
  o.push(`<path d="M64 206V194C64 190 96 190 96 194V206C96 210 64 210 64 206Z" fill="#221E1D" stroke="${C.char}" stroke-width="1.4"/><path d="M66 200q14 4 28 0" fill="none" stroke="${C.news}" stroke-width=".8" opacity=".45"/>`);
  // the taper, wax run down one side
  o.push(`<path d="M68 194V76C68 72 92 72 92 76V194Z" fill="${C.news}" stroke="${C.char}" stroke-width="1.6"/>`);
  o.push(`<path d="M82 76V194H92V76C92 74 88 73 82 73Z" fill="${C.char}" mask="url(#art-m-v)" opacity=".35"/>`);
  o.push(`<path d="M68 80c0 6 2 18-1 26c-2 4 3 6 4 0c1-8-1-18 2-24z" fill="${C.news}" stroke="${C.char}" stroke-width="1.2" stroke-linejoin="round"/><path d="M86 78c2 4 1 10 3 12c2 2 3-2 2-6z" fill="${C.news}" stroke="${C.char}" stroke-width="1" stroke-linejoin="round"/>`);
  o.push(`<ellipse cx="80" cy="76" rx="12" ry="3.4" fill="#E2D8C6" stroke="${C.char}" stroke-width="1.2"/>`);
  // wick and flame
  o.push(`<path d="M80 76l1-12" stroke="${C.char}" stroke-width="2" stroke-linecap="round"/>`);
  o.push(`<path d="M81 66C72 62 72 46 79 28C88 46 90 62 81 66Z" fill="${C.o2}" stroke="${C.char}" stroke-width="1.3" stroke-linejoin="round"/><path d="M81 63C76 60 76 50 80 40C85 50 86 60 81 63Z" fill="#FFAD4C"/><path d="M81 62C79 60 79 55 81 50C83 55 83 60 81 62Z" fill="${C.news}"/>`);
  // a marigold laid on the table, in profile, its calyx toward the dish
  o.push(marigold(R, 128, 214, 20, 1.2, 1.45, HEADS.gold, 60));
  return { W, H, body: o.join('') };
}

// A trowel left standing in turned dirt, beside a marigold seedling in bud.
function trowel() {
  const R = rng(7707);
  const W = 220, H = 220;
  const o = [];
  const G = 196;
  const mound = (x) => G - 46 * Math.exp(-(((x - 96) / 70) ** 2));
  // the back of the mound
  let m = `M0 ${G}`;
  for (let x = 0; x <= W; x += 10) m += `L${x} ${i0(mound(x))}`;
  o.push(`<path d="${m}L${W} ${H}H0Z" fill="#2A2422" stroke="${C.char}" stroke-width="1.4"/>`);
  // the seedling: a stem, cut leaves, one bud splitting orange
  o.push(inked('M172 176C172 154 168 122 175 90', 2.4, C.g1));
  o.push(`<g transform="translate(172 148) scale(.5)">${fern(R, 0, 0, -0.55, 90)}</g><g transform="translate(171 166) scale(.46)">${fern(R, 0, 0, -2.55, 84)}</g><g transform="translate(173 120) scale(.4)">${fern(R, 0, 0, -2.25, 72)}</g><g transform="translate(174 104) scale(.34)">${fern(R, 0, 0, -0.75, 60)}</g>`);
  o.push(bud(R, 175, 86, 11, 0.15, 1));
  // the trowel: handle up and right, the blade driven into the dirt
  const a = -1.0, base = [80, 176], k = 1.22;
  const T = (u, v) => rot([base[0] + v * k, base[1] - u * k], base, a + Math.PI / 2);
  // blade: a pointed spade with a ridge, its tip buried
  const blade = relPath(T(-34, 0), [['c', T(-20, -18), T(10, -22), T(30, -16)], ['l', T(34, -6)], ['l', T(34, 6)], ['l', T(30, 16)], ['c', T(10, 22), T(-20, 18), T(-34, 0)]]);
  o.push(`<path d="${blade}" fill="#D9D0C2" stroke="${C.char}" stroke-width="1.6" stroke-linejoin="round"/>`);
  o.push(`<path d="${relPath(T(-34, 0), [['l', T(34, 0)], ['l', T(30, 16)], ['c', T(10, 22), T(-20, 18), T(-34, 0)]])}" fill="${C.char}" mask="url(#art-m-h)" opacity=".4"/>`);
  o.push(`<path d="${relPath(T(-28, 0), [['l', T(34, 0)]], false)}" stroke="${C.char}" stroke-width="1.2"/>`);
  // neck and ferrule
  o.push(`<path d="${relPath(T(34, -3), [['l', T(52, -3)], ['l', T(52, 3)], ['l', T(34, 3)]])}" fill="#BFB4A4" stroke="${C.char}" stroke-width="1.4" stroke-linejoin="round"/>`);
  o.push(`<path d="${relPath(T(52, -8), [['l', T(64, -8)], ['l', T(64, 8)], ['l', T(52, 8)]])}" fill="#D9D0C2" stroke="${C.char}" stroke-width="1.4" stroke-linejoin="round"/><path d="${relPath(T(56, -8), [['l', T(56, 8)]], false)}${relPath(T(60, -8), [['l', T(60, 8)]], false)}" stroke="${C.char}" stroke-width="1"/>`);
  // the handle, painted orange, worn pale where the hand goes
  const handle = relPath(T(64, -8), [['c', T(80, -10), T(110, -10), T(124, -7)], ['c', T(132, -6), T(132, 6), T(124, 7)], ['c', T(110, 10), T(80, 10), T(64, 8)]]);
  o.push(`<path d="${handle}" fill="${C.o2}" stroke="${C.char}" stroke-width="1.6" stroke-linejoin="round"/>`);
  o.push(`<path d="${relPath(T(64, 1), [['c', T(80, 2), T(110, 2), T(126, 1)], ['c', T(130, 5), T(124, 7), T(124, 7)], ['c', T(110, 10), T(80, 10), T(64, 8)]])}" fill="${C.char}" mask="url(#art-m-d)" opacity=".4"/>`);
  o.push(`<path d="${relPath(T(72, -5), [['c', T(90, -6), T(108, -6), T(118, -4)]], false)}" fill="none" stroke="${C.o4}" stroke-width="2.4" stroke-linecap="round"/>`);
  const hole = T(118, 0);
  o.push(`<ellipse cx="${i0(hole[0])}" cy="${i0(hole[1])}" rx="2.6" ry="1.8" fill="${C.char}" transform="rotate(${i0(a * 57.3)} ${i0(hole[0])} ${i0(hole[1])})"/>`);
  // the front lip of dirt over the buried tip, clods and specks
  const lipY = (x) => G + 6 - 30 * Math.exp(-(((x - 64) / 46) ** 2));
  let lip = `M0 ${G + 6}`;
  for (let x = 0; x <= 170; x += 8) lip += `L${x} ${i0(lipY(x) + (R() - 0.5) * 3)}`;
  o.push(`<path d="${lip}L170 ${H}H0Z" fill="#332B28" stroke="${C.char}" stroke-width="1.4" stroke-linejoin="round"/>`);
  let clods = '';
  for (let i = 0; i < 14; i++) { const x = 20 + R() * 180, y = mound(x) + 4 + R() * (G - mound(x)); clods += `<ellipse cx="${i0(x)}" cy="${i0(y)}" rx="${(2 + R() * 3).toFixed(1)}" ry="${(1.4 + R() * 1.6).toFixed(1)}" fill="#40362F" stroke="${C.char}" stroke-width=".9"/>`; }
  o.push(clods);
  o.push(`<path d="${stipple(R, 420, [0, 140, W, 80], (x, y) => y > mound(x) + 2)}" stroke="#7A6A5C" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>`);
  o.push(`<path d="M0 ${G + 14}H${W}" stroke="${C.news}" stroke-width="1" opacity=".3"/>`);
  return { W, H, body: o.join('') };
}


function single() {
  const R = rng(55);
  return { W: 160, H: 150, body: marigold(R, 80, 60, 54, 0.95, -0.25, HEADS.toxic) };
}

// The drawings by short name. A page names the ones it uses in its art region
// ({"art": ["marigold"]}); each becomes a <symbol id="art-NAME">.
const DRAWINGS = { 'still-life': stillLife, street, marigold: single, poppy, can, balance, candle, trowel };
const NAMES = Object.keys(DRAWINGS);

// Hatch masks and the murky ground the drawings share. Always stamped with any
// art region (about 1.4 KB), since page markup may use them too (Fig. 1).
function defs() {
  const hatchMask = (id, pat, w, h, lines, sw = 0.7) =>
    `<pattern id="${pat}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${lines.map((d) => `<path d="${d}" stroke="#fff" stroke-width="${sw}"/>`).join('')}</pattern>` +
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="900"><rect width="1200" height="900" fill="url(#${pat})"/></mask>`;
  return '<radialGradient id="art-murk" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#4C423B"/><stop offset=".5" stop-color="#342D2A"/><stop offset="1" stop-color="#1F1B1A"/></radialGradient>' +
    hatchMask('art-m-h', 'art-p-h', 4, 2, ['M0 1h4'], 0.8) +
    hatchMask('art-m-h3', 'art-p-h3', 4, 3.2, ['M0 1.6h4'], 0.7) +
    hatchMask('art-m-v', 'art-p-v', 2, 4, ['M1 0v4'], 0.7) +
    hatchMask('art-m-d', 'art-p-d', 3, 3, ['M-1 1l2-2M0 3l3-3M2 4l2-2'], 0.65);
}
const DEF_IDS = ['art-murk', 'art-p-h', 'art-m-h', 'art-p-h3', 'art-m-h3', 'art-p-v', 'art-m-v', 'art-p-d', 'art-m-d'];

// One drawing per name, drawn once per process (the still life takes a moment).
const drawn = new Map();
function draw(name) {
  if (!DRAWINGS[name]) throw new Error(`Unknown drawing "${name}". Known: ${NAMES.join(', ')}`);
  if (!drawn.has(name)) drawn.set(name, DRAWINGS[name]());
  return drawn.get(name);
}

// The art sprite for a page: shared defs plus the named drawings, in the order
// given. Returns the markup and a size line per drawing.
function symbols(names = NAMES) {
  let svg = `<svg class="art-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${defs()}</defs>\n`;
  const sizes = [];
  for (const name of names) {
    const a = draw(name);
    svg += `<symbol id="art-${name}" viewBox="0 0 ${a.W} ${a.H}">${a.body}</symbol>\n`;
    sizes.push(`art-${name} ${a.W}x${a.H} ${(a.body.length / 1024).toFixed(1)} KB`);
  }
  return { svg: `${svg}</svg>`, sizes };
}

module.exports = { symbols, NAMES, DEF_IDS };

// The drawings are written into pages by build-pages.js; running this file
// directly does the same.
if (require.main === module) require('./build-pages').main(process.argv.slice(2));
