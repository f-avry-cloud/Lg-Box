// Extraction de la géométrie des pièces depuis les SVG relevés.
//
// Principe : les <path> de murs tracent le contour des cloisons. On les
// convertit en segments horizontaux/verticaux dans le repère écran, puis pour
// chaque étiquette de pièce on lance 4 rayons (gauche/droite/haut/bas) jusqu'au
// premier mur rencontré. L'intersection des 4 donne le rectangle de la pièce.
//
// Sortie : JSON { niveau: [ { label, x, y, w, h } ] } en coordonnées du plan.

import { readFileSync, writeFileSync } from "node:fs";

const UP = "/root/.claude/uploads/9241dae0-e9a7-5d0c-a31a-0dcfff126ba4";
const FILES = {
  soussol: { path: `${UP}/0a9a482b-soussol_svg.txt`, groups: { cl_5: "sous-sol" } },
  rdc: { path: `${UP}/f774c8ea-rdc_svg.txt`, groups: { cl_3: "rdc", cl_4: "etage" } },
};

const TOL = 0.75; // tolérance px pour considérer un segment axé

function parseMatrix(str) {
  const m = str.match(/matrix\(([^)]+)\)/);
  if (!m) return null;
  const n = m[1].trim().split(/[\s,]+/).map(Number);
  return { a: n[0], b: n[1], c: n[2], d: n[3], e: n[4], f: n[5] };
}

function apply(mx, x, y) {
  return { x: mx.a * x + mx.c * y + mx.e, y: mx.b * x + mx.d * y + mx.f };
}

// Découpe le SVG en groupes <g clip-path="url(#cl_N)"> ... </g>
function splitGroups(svg) {
  const out = {};
  const re = /<g clip-path="url\(#(cl_\d+)\)">([\s\S]*?)<\/g>/g;
  let m;
  while ((m = re.exec(svg))) out[m[1]] = m[2];
  return out;
}

// Segments axés issus des <path> de murs (ceux sans stroke : la masse pleine).
function wallSegments(groupSvg) {
  const segs = [];
  const re = /<path([^>]*?)d="([^"]+)"/g;
  let m;
  while ((m = re.exec(groupSvg))) {
    const attrs = m[1];
    const d = m[2];
    if (/stroke="black"/.test(attrs)) continue; // arcs de porte, pas des murs
    const mx = parseMatrix(attrs);
    if (!mx) continue;

    // Sous-chemins : chaque M démarre un nouveau contour
    for (const sub of d.split(/(?=M)/)) {
      const pts = [];
      const pre = /([ML])\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g;
      let p;
      while ((p = pre.exec(sub))) pts.push(apply(mx, parseFloat(p[2]), parseFloat(p[3])));
      for (let i = 0; i + 1 < pts.length; i++) {
        const A = pts[i], B = pts[i + 1];
        if (Math.abs(A.y - B.y) < TOL && Math.abs(A.x - B.x) > TOL) {
          segs.push({ dir: "h", y: (A.y + B.y) / 2, a: Math.min(A.x, B.x), b: Math.max(A.x, B.x) });
        } else if (Math.abs(A.x - B.x) < TOL && Math.abs(A.y - B.y) > TOL) {
          segs.push({ dir: "v", x: (A.x + B.x) / 2, a: Math.min(A.y, B.y), b: Math.max(A.y, B.y) });
        }
      }
    }
  }
  return segs;
}

// Étiquettes : <text ... transform="translate(X Y)" ...> LABEL </text>
function labels(groupSvg) {
  const out = [];
  const re = /<text[^>]*transform="translate\(([-\d.]+)[\s,]+([-\d.]+)\)"[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(groupSvg))) {
    const label = m[3].replace(/\s+/g, " ").trim();
    if (label) out.push({ label, ax: parseFloat(m[1]), ay: parseFloat(m[2]) });
  }
  return out;
}

// Un seul rayon fuit par les ouvertures de porte. On en lance donc plusieurs
// en parallèle et on retient la valeur majoritaire : une porte est minoritaire
// sur la longueur d'un mur, les rayons qui fuient sont donc des exceptions.
function ray(segs, px, py, dir) {
  let best = dir === "left" || dir === "up" ? -Infinity : Infinity;
  for (const s of segs) {
    if (dir === "left" || dir === "right") {
      if (s.dir !== "v" || py <= s.a + TOL || py >= s.b - TOL) continue;
      if (dir === "left" && s.x <= px && s.x > best) best = s.x;
      if (dir === "right" && s.x >= px && s.x < best) best = s.x;
    } else {
      if (s.dir !== "h" || px <= s.a + TOL || px >= s.b - TOL) continue;
      if (dir === "up" && s.y <= py && s.y > best) best = s.y;
      if (dir === "down" && s.y >= py && s.y < best) best = s.y;
    }
  }
  return Number.isFinite(best) ? best : null;
}

// Valeur majoritaire (arrondie au pixel). À égalité, la plus proche du point
// de départ — un mur réel prime sur une fuite lointaine.
function vote(values, preferHigh) {
  const counts = new Map();
  for (const v of values) {
    if (v === null) continue;
    const k = Math.round(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (!counts.size) return null;
  let bestK = null, bestN = -1;
  for (const [k, n] of counts) {
    if (n > bestN || (n === bestN && (preferHigh ? k > bestK : k < bestK))) { bestK = k; bestN = n; }
  }
  return bestK;
}

function castRoom(segs, px, py) {
  // Passe 1 : estimation grossière depuis le point de sonde.
  const rough = {
    left: ray(segs, px, py, "left"), right: ray(segs, px, py, "right"),
    top: ray(segs, px, py, "up"), bottom: ray(segs, px, py, "down"),
  };
  if (Object.values(rough).some((v) => v === null)) return null;

  // Passe 2 : vote sur 9 rayons répartis dans l'emprise estimée, réitéré —
  // si la passe 1 a fui, la première emprise est trop grande et les rayons
  // mal répartis ; on relance sur l'emprise corrigée jusqu'à stabilisation.
  const frac = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  let box = { ...rough };
  for (let iter = 0; iter < 6; iter++) {
    const xs = frac.map((f) => box.left + (box.right - box.left) * f);
    const ys = frac.map((f) => box.top + (box.bottom - box.top) * f);

    const top = vote(xs.map((x) => ray(segs, x, py, "up")), true);
    const bottom = vote(xs.map((x) => ray(segs, x, py, "down")), false);
    const left = vote(ys.map((y) => ray(segs, px, y, "left")), true);
    const right = vote(ys.map((y) => ray(segs, px, y, "right")), false);
    if ([top, bottom, left, right].some((v) => v === null)) return null;

    // Le point de sonde doit rester dans l'emprise, sinon le vote a divergé.
    if (px <= left || px >= right || py <= top || py >= bottom) return null;

    const next = { left, right, top, bottom };
    const stable = ["left", "right", "top", "bottom"].every((k) => Math.abs(next[k] - box[k]) < 0.5);
    box = next;
    if (stable) break;
  }

  if (box.right - box.left < 2 || box.bottom - box.top < 2) return null;
  return { x: box.left, y: box.top, w: box.right - box.left, h: box.bottom - box.top };
}

const result = {};
for (const { path, groups } of Object.values(FILES)) {
  const svg = readFileSync(path, "utf8");
  const parts = splitGroups(svg);
  for (const [clip, floorName] of Object.entries(groups)) {
    const g = parts[clip];
    if (!g) { console.error(`groupe ${clip} introuvable`); continue; }
    const segs = wallSegments(g);
    const rooms = [];
    for (const l of labels(g)) {
      // Sonde légèrement décalée du coin haut-gauche du texte, pour tomber
      // franchement à l'intérieur de la pièce.
      const r = castRoom(segs, l.ax + 4, l.ay + 9);
      rooms.push({ label: l.label, ax: l.ax + 4, ay: l.ay + 9, ...(r ?? { x: null, y: null, w: null, h: null }) });
    }
    result[floorName] = rooms;
    console.error(`${floorName}: ${segs.length} segments, ${rooms.length} étiquettes, ${rooms.filter(r => r.w).length} pièces résolues`);
  }
}

writeFileSync(new URL("./rooms-geometry.json", import.meta.url), JSON.stringify(result, null, 2));

// Contrôle : le sous-sol a été dérivé à la main, on compare.
const EXPECTED = {
  "1": [704.36, 482.97, 70.59, 57.16], "2": [690.91, 436.91, 56.09, 43.75],
  "3": [633.30, 436.89, 55.30, 43.75], "4": [633.32, 482.92, 68.73, 57.11],
  "5": [555.00, 436.87, 47.30, 73.25], "6": [505.08, 418.93, 47.67, 91.28],
};
console.error("\n-- contrôle sous-sol (écart max attendu < 1 px) --");
for (const r of result["sous-sol"] ?? []) {
  const e = EXPECTED[r.label];
  if (!e) { console.error(`  ${r.label.padEnd(11)} (non contrôlé) ${r.w ? `${r.w.toFixed(1)}x${r.h.toFixed(1)}` : "NON RÉSOLU"}`); continue; }
  if (!r.w) { console.error(`  ${r.label.padEnd(11)} NON RÉSOLU`); continue; }
  const d = Math.max(Math.abs(r.x - e[0]), Math.abs(r.y - e[1]), Math.abs(r.w - e[2]), Math.abs(r.h - e[3]));
  console.error(`  ${r.label.padEnd(11)} écart ${d.toFixed(2)} px ${d < 1 ? "OK" : "!!"}`);
}
