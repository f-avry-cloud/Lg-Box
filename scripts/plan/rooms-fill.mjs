// Délimitation des pièces par remplissage (au lieu de lancers de rayons).
//
// 1. on rasterise la masse des murs ;
// 2. on referme chaque ouverture de porte en traçant la corde de son arc —
//    le plan dessine les portes, autant s'en servir pour clore les pièces ;
// 3. on remplit depuis chaque numéro : la tache obtenue EST la pièce, quelle
//    que soit sa forme (en L, biscornue...), sans supposer un rectangle.
import { readFileSync, writeFileSync } from "node:fs";

const UP = "/root/.claude/uploads/9241dae0-e9a7-5d0c-a31a-0dcfff126ba4";
const SRC = {
  "sous-sol": { file: `${UP}/0a9a482b-soussol_svg.txt`, clip: "cl_5" },
  rdc: { file: `${UP}/f774c8ea-rdc_svg.txt`, clip: "cl_3" },
  etage: { file: `${UP}/f774c8ea-rdc_svg.txt`, clip: "cl_4" },
};
const RES = 1; // px par cellule

const grp = (svg, clip) => (svg.match(new RegExp(`<g clip-path="url\\(#${clip}\\)">([\\s\\S]*?)</g>`)) ?? [])[1] ?? "";
const mat = (s) => { const m = s.match(/matrix\(([^)]+)\)/); if (!m) return null;
  const n = m[1].trim().split(/[\s,]+/).map(Number); return { a:n[0],b:n[1],c:n[2],d:n[3],e:n[4],f:n[5] }; };
const app = (m, x, y) => ({ x: m.a*x + m.c*y + m.e, y: m.b*x + m.d*y + m.f });

function parse(groupSvg) {
  const walls = [], doors = [], labels = [];
  const re = /<path([^>]*?)d="([^"]+)"\s*\/>/g; let m;
  while ((m = re.exec(groupSvg))) {
    const attrs = m[1], d = m[2], mx = mat((attrs.match(/transform="([^"]+)"/) ?? [])[1] ?? "");
    if (!mx) continue;
    if (/stroke="black"/.test(attrs)) {
      // Arc de porte : on ne garde que ses extrémités, dont la corde ferme
      // l'ouverture dans le mur.
      const pts = [...d.matchAll(/(-?[\d.]+)[\s,]+(-?[\d.]+)/g)].map((p) => app(mx, +p[1], +p[2]));
      if (pts.length >= 2) doors.push([pts[0], pts[pts.length - 1]]);
      continue;
    }
    if (/fill="white"/.test(attrs) || /fill-opacity/.test(attrs)) continue; // sol, pas mur
    for (const sub of d.split(/(?=M)/)) {
      const pts = [...sub.matchAll(/[ML]\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g)].map((p) => app(mx, +p[1], +p[2]));
      if (pts.length > 2) walls.push(pts);
    }
  }
  const rl = /<text[^>]*transform="translate\(([-\d.]+)[\s,]+([-\d.]+)\)"[^>]*>([\s\S]*?)<\/text>/g;
  while ((m = rl.exec(groupSvg))) {
    const label = m[3].replace(/\s+/g, " ").trim();
    if (label) labels.push({ label, ax: +m[1] + 4, ay: +m[2] + 9 });
  }
  return { walls, doors, labels };
}

function raster({ walls, doors }, bb) {
  const W = Math.ceil(bb.w / RES), H = Math.ceil(bb.h / RES);
  const solid = new Uint8Array(W * H);
  // Remplissage par balayage, règle non-zero sur l'ensemble des contours.
  for (let gy = 0; gy < H; gy++) {
    const y = bb.x0 === undefined ? 0 : bb.y0 + (gy + 0.5) * RES;
    const xs = [];
    for (const poly of walls) {
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length];
        if (A.y === B.y) continue;
        if ((y >= A.y && y < B.y) || (y >= B.y && y < A.y)) {
          xs.push({ x: A.x + ((y - A.y) / (B.y - A.y)) * (B.x - A.x), w: B.y > A.y ? 1 : -1 });
        }
      }
    }
    xs.sort((p, q) => p.x - q.x);
    let wind = 0;
    for (let i = 0; i < xs.length; i++) {
      const before = wind; wind += xs[i].w;
      if (before === 0 && wind !== 0) xs[i].start = true;
      if (before !== 0 && wind === 0 && i + 1 <= xs.length) xs[i].end = true;
    }
    wind = 0; let from = null;
    for (const p of xs) {
      const before = wind; wind += p.w;
      if (before === 0 && wind !== 0) from = p.x;
      else if (before !== 0 && wind === 0 && from !== null) {
        const a = Math.max(0, Math.floor((from - bb.x0) / RES)), b = Math.min(W - 1, Math.ceil((p.x - bb.x0) / RES));
        for (let gx = a; gx <= b; gx++) solid[gy * W + gx] = 1;
        from = null;
      }
    }
  }
  // Cordes de portes : referment les ouvertures.
  for (const [A, B] of doors) {
    const n = Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / (RES / 2)) + 1;
    for (let i = 0; i <= n; i++) {
      const x = A.x + ((B.x - A.x) * i) / n, y = A.y + ((B.y - A.y) * i) / n;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const gx = Math.round((x - bb.x0) / RES) + dx, gy = Math.round((y - bb.y0) / RES) + dy;
        if (gx >= 0 && gx < W && gy >= 0 && gy < H) solid[gy * W + gx] = 1;
      }
    }
  }
  return { solid, W, H };
}

const out = {};
for (const [name, meta] of Object.entries(SRC)) {
  const p = parse(grp(readFileSync(meta.file, "utf8"), meta.clip));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of p.walls) for (const pt of poly) {
    x0 = Math.min(x0, pt.x); x1 = Math.max(x1, pt.x); y0 = Math.min(y0, pt.y); y1 = Math.max(y1, pt.y);
  }
  const bb = { x0: x0 - 4, y0: y0 - 4, w: x1 - x0 + 8, h: y1 - y0 + 8 };
  const { solid, W, H } = raster(p, bb);

  const rooms = [];
  const seen = new Int32Array(W * H).fill(-1);
  p.labels.forEach((l, idx) => {
    const sx = Math.round((l.ax - bb.x0) / RES), sy = Math.round((l.ay - bb.y0) / RES);
    if (sx < 0 || sy < 0 || sx >= W || sy >= H || solid[sy * W + sx]) {
      rooms.push({ ...l, ok: false, why: "numéro sur un mur" }); return;
    }
    const st = [sy * W + sx]; const cells = [];
    let mnx = W, mny = H, mxx = 0, mxy = 0, touche = false;
    while (st.length) {
      const c = st.pop();
      if (seen[c] === idx || solid[c]) continue;
      if (seen[c] !== -1) { touche = true; continue; }
      seen[c] = idx; cells.push(c);
      const gx = c % W, gy = (c - gx) / W;
      if (gx < mnx) mnx = gx; if (gx > mxx) mxx = gx;
      if (gy < mny) mny = gy; if (gy > mxy) mxy = gy;
      if (gx === 0 || gy === 0 || gx === W - 1 || gy === H - 1) touche = true;
      if (gx > 0) st.push(c - 1); if (gx < W - 1) st.push(c + 1);
      if (gy > 0) st.push(c - W); if (gy < H - 1) st.push(c + W);
    }
    rooms.push({ ...l, ok: !touche && cells.length > 20,
      why: touche ? "fuite vers l'extérieur" : cells.length <= 20 ? "trop petit" : null,
      x: bb.x0 + mnx * RES, y: bb.y0 + mny * RES,
      w: (mxx - mnx + 1) * RES, h: (mxy - mny + 1) * RES,
      aire: cells.length * RES * RES,
    });
  });
  // Contrôle décisif : une pièce close ne doit contenir aucun autre numéro.
  // Si c'est le cas, le remplissage a fusionné deux pièces (cloison non
  // étanche) — les deux formes sont alors fausses, on les écarte.
  rooms.forEach((r, i) => {
    if (!r.ok) return;
    for (let j = 0; j < rooms.length; j++) {
      if (j === i) continue;
      const o = rooms[j];
      const gx = Math.round((o.ax - bb.x0) / RES), gy = Math.round((o.ay - bb.y0) / RES);
      if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
      if (seen[gy * W + gx] === i) { r.ok = false; r.why = `absorbe la pièce ${o.label}`; return; }
    }
  });

  out[name] = rooms;
  const ko = rooms.filter((r) => !r.ok);
  console.error(`${name}: ${rooms.length} étiquettes, ${rooms.length - ko.length} pièces closes` +
    (ko.length ? ` — échecs: ${ko.map((r) => r.label + " (" + r.why + ")").join(", ")}` : ""));
}
writeFileSync(new URL("./rooms-fill.json", import.meta.url), JSON.stringify(out, null, 2));
