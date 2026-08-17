import { readFileSync, writeFileSync } from "node:fs";
const UP = "/root/.claude/uploads/9241dae0-e9a7-5d0c-a31a-0dcfff126ba4";
const map = JSON.parse(readFileSync(new URL("./mapping-v3.json", import.meta.url), "utf8"));

// 4D : relevé sur le plan, créé en base ensuite — il doit suivre la même origine.


const K = 100 / 18.9247, MARGE = 100;
const FLOOR = { "Rez-de-jardin": "sous_sol", "Étage": "premier_etage" };
const floorOf = (z) => FLOOR[z] ?? "rez_de_chaussee";
const SRC = {
  sous_sol: { file: `${UP}/0a9a482b-soussol_svg.txt`, clip: "cl_5" },
  rez_de_chaussee: { file: `${UP}/f774c8ea-rdc_svg.txt`, clip: "cl_3" },
  premier_etage: { file: `${UP}/f774c8ea-rdc_svg.txt`, clip: "cl_4" },
};

// Origine commune aux box ET au fond : calculée sur l'ensemble des box calés.
const groupes = {};
for (const b of map) (groupes[floorOf(b.zone)] ??= []).push(b);
const ORIGINE = {};
for (const [f, bs] of Object.entries(groupes)) {
  ORIGINE[f] = { ox: Math.min(...bs.map((b) => b.x)), oy: Math.min(...bs.map((b) => b.y)) };
}

// --- positions ---
const rows = [];
for (const [f, bs] of Object.entries(groupes)) {
  const { ox, oy } = ORIGINE[f];
  for (const b of bs) rows.push(
    `('${b.zone}','${b.numero.replace(/'/g, "''")}',${Math.round((b.x - ox) * K) + MARGE},${Math.round((b.y - oy) * K) + MARGE},${Math.round(b.w * K)},${Math.round(b.h * K)})`
  );
}
writeFileSync(new URL("./positions-v2.sql", import.meta.url),
`update units u set pos_x=v.px, pos_y=v.py, largeur_cm=v.w, profondeur_cm=v.h, rotation_deg=0 from (values ${rows.join(", ")}) as v(zone,numero,px,py,w,h) where u.zone=v.zone and u.numero=v.numero;`);

// --- fond de plan ---
const grp = (svg, clip) => (svg.match(new RegExp(`<g clip-path="url\\(#${clip}\\)">([\\s\\S]*?)</g>`)) ?? [])[1] ?? "";
const parseMatrix = (s) => { const m = s.match(/matrix\(([^)]+)\)/); if (!m) return null;
  const n = m[1].trim().split(/[\s,]+/).map(Number); return { a:n[0],b:n[1],c:n[2],d:n[3],e:n[4],f:n[5] }; };
const out = {};
for (const [floor, meta] of Object.entries(SRC)) {
  const { ox, oy } = ORIGINE[floor];
  const g = grp(readFileSync(meta.file, "utf8"), meta.clip);
  const paths = []; let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
  const re = /<path([^>]*?)d="([^"]+)"\s*\/>/g; let m;
  while ((m = re.exec(g))) {
    const attrs = m[1], d = m[2];
    if (/fill="white"/.test(attrs)) continue;
    const t = (attrs.match(/transform="([^"]+)"/) ?? [])[1] ?? "";
    paths.push({ cls: /stroke="black"/.test(attrs) ? "door" : /fill-opacity/.test(attrs) ? "floor" : "wall", t, d });
    const mx = parseMatrix(t); if (!mx) continue;
    const pre = /([ML])\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g; let p;
    while ((p = pre.exec(d))) {
      const X = mx.a*parseFloat(p[2]) + mx.c*parseFloat(p[3]) + mx.e;
      const Y = mx.b*parseFloat(p[2]) + mx.d*parseFloat(p[3]) + mx.f;
      mnX=Math.min(mnX,X); mxX=Math.max(mxX,X); mnY=Math.min(mnY,Y); mxY=Math.max(mxY,Y);
    }
  }
  const cm = (v,o) => Math.round((v-o)*K + MARGE);
  out[floor] = {
    transform: `translate(${(MARGE - K*ox).toFixed(3)} ${(MARGE - K*oy).toFixed(3)}) scale(${K.toFixed(6)})`,
    viewBox: [cm(mnX,ox)-60, cm(mnY,oy)-60, Math.round((mxX-mnX)*K)+120, Math.round((mxY-mnY)*K)+120],
    paths,
  };
}
const esc = (s) => s.replace(/\\/g,"\\\\").replace(/"/g,'\\"');
writeFileSync("/home/user/Lg-Box/lib/units/floor-plan-walls.ts",
`// GÉNÉRÉ par scripts/plan/ — ne pas modifier à la main.
// Murs, sols et portes relevés du bâtiment, transposés dans le repère en
// centimètres utilisé par les box (voir scripts/plan/README.md).
// Le relevé sert uniquement de fond de plan : il ne détermine ni les surfaces
// ni les prix, qui restent saisis à la main.
import type { UnitFloor } from "@/types/database";

export type WallPath = { cls: "wall" | "floor" | "door"; t: string; d: string };
export type FloorBackground = { transform: string; viewBox: [number, number, number, number]; paths: WallPath[] };

export const FLOOR_BACKGROUNDS: Record<UnitFloor, FloorBackground> = {
${Object.entries(out).map(([f,v]) => `  ${f}: {
    transform: "${v.transform}",
    viewBox: [${v.viewBox.join(", ")}],
    paths: [
${v.paths.map((p)=>`      { cls: "${p.cls}", t: "${esc(p.t)}", d: "${esc(p.d)}" },`).join("\n")}
    ],
  },`).join("\n")}
};
`);
console.error(`${rows.length} positions, origines: ` + Object.entries(ORIGINE).map(([f,o])=>`${f}(${o.ox.toFixed(0)},${o.oy.toFixed(0)})`).join(" "));
