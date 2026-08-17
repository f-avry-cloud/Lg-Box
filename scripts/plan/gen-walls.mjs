import { readFileSync, writeFileSync } from "node:fs";
const UP = "/root/.claude/uploads/9241dae0-e9a7-5d0c-a31a-0dcfff126ba4";
const map = JSON.parse(readFileSync(new URL("./mapping.json", import.meta.url), "utf8"));

const K = 100 / 18.9247, MARGE = 100;
const SRC = {
  sous_sol: { file: `${UP}/0a9a482b-soussol_svg.txt`, clip: "cl_5", zones: ["Rez-de-jardin"] },
  rez_de_chaussee: { file: `${UP}/f774c8ea-rdc_svg.txt`, clip: "cl_3", zones: ["Bâtiment 1", "Bâtiment 2", "Bâtiment 3", "Bâtiment 4"] },
  premier_etage: { file: `${UP}/f774c8ea-rdc_svg.txt`, clip: "cl_4", zones: ["Étage"] },
};
// Mêmes rejets que lors de l'écriture des positions : l'origine doit être
// calculée sur exactement le même sous-ensemble, sinon murs et box se décalent.
const REJETS = new Set(["Bâtiment 4|4a","Bâtiment 4|4b","Bâtiment 3|8","Bâtiment 3|2",
  "Bâtiment 2|1","Bâtiment 2|2","Bâtiment 2|6","Étage|9","Étage|1","Étage|13"]);

const grp = (svg, clip) => (svg.match(new RegExp(`<g clip-path="url\\(#${clip}\\)">([\\s\\S]*?)</g>`)) ?? [])[1] ?? "";
const parseMatrix = (s) => { const m = s.match(/matrix\(([^)]+)\)/); if (!m) return null;
  const n = m[1].trim().split(/[\s,]+/).map(Number); return { a:n[0],b:n[1],c:n[2],d:n[3],e:n[4],f:n[5] }; };

const out = {};
for (const [floor, meta] of Object.entries(SRC)) {
  const boxes = map.filter((b) => meta.zones.includes(b.zone) && !REJETS.has(`${b.zone}|${b.numero}`));
  const ox = Math.min(...boxes.map((b) => b.x)), oy = Math.min(...boxes.map((b) => b.y));

  const g = grp(readFileSync(meta.file, "utf8"), meta.clip);
  const paths = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const re = /<path([^>]*?)d="([^"]+)"\s*\/>/g;
  let m;
  while ((m = re.exec(g))) {
    const attrs = m[1], d = m[2];
    if (/fill="white"/.test(attrs)) continue; // symboles de menuiserie, inutiles ici
    const t = (attrs.match(/transform="([^"]+)"/) ?? [])[1] ?? "";
    const cls = /stroke="black"/.test(attrs) ? "door" : /fill-opacity/.test(attrs) ? "floor" : "wall";
    paths.push({ cls, t, d });

    const mx = parseMatrix(t);
    if (!mx) continue;
    const pre = /([ML])\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g;
    let p;
    while ((p = pre.exec(d))) {
      const x = mx.a * parseFloat(p[2]) + mx.c * parseFloat(p[3]) + mx.e;
      const y = mx.b * parseFloat(p[2]) + mx.d * parseFloat(p[3]) + mx.f;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }

  const toCm = (v, o) => Math.round((v - o) * K + MARGE);
  out[floor] = {
    transform: `translate(${(MARGE - K * ox).toFixed(3)} ${(MARGE - K * oy).toFixed(3)}) scale(${K.toFixed(6)})`,
    viewBox: [toCm(minX, ox) - 60, toCm(minY, oy) - 60, Math.round((maxX - minX) * K) + 120, Math.round((maxY - minY) * K) + 120],
    paths,
  };
  console.error(`${floor}: ${paths.length} tracés, viewBox ${out[floor].viewBox.join(" ")}`);
}

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const body = Object.entries(out).map(([f, v]) => `  ${f}: {
    transform: "${v.transform}",
    viewBox: [${v.viewBox.join(", ")}],
    paths: [
${v.paths.map((p) => `      { cls: "${p.cls}", t: "${esc(p.t)}", d: "${esc(p.d)}" },`).join("\n")}
    ],
  },`).join("\n");

writeFileSync(new URL("./floor-plan-walls.ts", import.meta.url),
`// GÉNÉRÉ — ne pas modifier à la main.
// Murs, sols et portes relevés du bâtiment, transposés dans le repère en
// centimètres utilisé par les box (voir scripts/plan/README).
// Le relevé sert uniquement de fond de plan : il ne détermine ni les surfaces
// ni les prix, qui restent saisis à la main.
import type { UnitFloor } from "@/types/database";

export type WallPath = { cls: "wall" | "floor" | "door"; t: string; d: string };
export type FloorBackground = { transform: string; viewBox: [number, number, number, number]; paths: WallPath[] };

export const FLOOR_BACKGROUNDS: Record<UnitFloor, FloorBackground> = {
${body}
};
`);
console.error("→ floor-plan-walls.ts");
