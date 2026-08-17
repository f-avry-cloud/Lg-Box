// Chaîne complète : forme des pièces (remplissage, repli sur lancer de rayons)
// → rattachement aux box en base → positions + fond de plan.
import { readFileSync, writeFileSync } from "node:fs";
const fill = JSON.parse(readFileSync(new URL("./rooms-fill.json", import.meta.url), "utf8"));
const ray = JSON.parse(readFileSync(new URL("./rooms-geometry.json", import.meta.url), "utf8"));
const NON_BOX = /^(couloir|hall|vestibule|atelier|cave|chaufferie)$/i;
const DB = {
  "Bâtiment 1": "1,10,11,12,14,15,2a,2b,2c,4,5,6,7,8,9".split(","),
  "Bâtiment 2": "1,2,3,4,5,6,7,8,9".split(","),
  "Bâtiment 3": "1,10,11,2,22,3,4,8,9".split(","),
  "Bâtiment 4": "1,2,3,4a,4b,4c,4d,5,6,7".split(","),
  "Étage": "1,10,10 bis,11,12,13,2,3,3bis,4,5,6,7,8,9,9A,9B,9C,9D".split(","),
  "Rez-de-jardin": "1,2,3,4,5,6".split(","),
};
const norm = (s) => s.toLowerCase().replace(/\s+/g, "");

// Géométrie retenue : le remplissage quand il a clos la pièce, sinon le
// lancer de rayons (moins fidèle mais toujours centré sur le bon numéro).
const geo = {};
let replis = [];
for (const [niv, rooms] of Object.entries(fill)) {
  geo[niv] = rooms.map((r) => {
    if (r.ok) return { label: r.label, ax: r.ax, ay: r.ay, x: r.x, y: r.y, w: r.w, h: r.h, src: "remplissage" };
    const alt = (ray[niv] ?? []).find((q) => Math.abs(q.ax - r.ax) < 0.5 && Math.abs(q.ay - r.ay) < 0.5 && q.w);
    if (!alt) return null;
    if (!NON_BOX.test(r.label)) replis.push(`${niv} ${r.label}`);
    return { label: r.label, ax: r.ax, ay: r.ay, x: alt.x, y: alt.y, w: alt.w, h: alt.h, src: "rayons" };
  }).filter(Boolean);
}
console.error(`repli sur lancer de rayons : ${replis.length ? replis.join(", ") : "aucun"}`);

// --- rattachement RDC aux 4 bâtiments (recherche exhaustive validée) ---
const rdc = geo.rdc.filter((r) => !NON_BOX.test(r.label)).sort((a, b) => a.x - b.x);
const ordre = ["Bâtiment 4", "Bâtiment 3", "Bâtiment 2", "Bâtiment 1"];
const same = (a, b) => { const x = [...a].sort(), y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]); };
let sol = null;
for (let i = 1; i < rdc.length - 2 && !sol; i++)
  for (let j = i + 1; j < rdc.length - 1 && !sol; j++)
    for (let k = j + 1; k < rdc.length && !sol; k++) {
      const p = [rdc.slice(0, i), rdc.slice(i, j), rdc.slice(j, k), rdc.slice(k)];
      if (p.every((c, n) => same(c.map((r) => norm(r.label)), DB[ordre[n]].map(norm)))) sol = p;
    }
if (!sol) { console.error("découpage en bâtiments introuvable — arrêt"); process.exit(1); }

const map = [];
const lier = (zone, rooms) => {
  const att = DB[zone].map(norm);
  for (const r of rooms) {
    const i = att.indexOf(norm(r.label));
    if (i >= 0) map.push({ zone, numero: DB[zone][i], ...r });
  }
  const abs = att.filter((n) => !rooms.some((r) => norm(r.label) === n));
  if (abs.length) console.error(`${zone} : absent du plan → ${abs.join(", ")}`);
};
sol.forEach((c, i) => lier(ordre[i], c));
lier("Étage", geo.etage.filter((r) => !NON_BOX.test(r.label)));
lier("Rez-de-jardin", geo["sous-sol"].filter((r) => !NON_BOX.test(r.label)));

// --- recouvrements : on recoupe à la frontière d'après la position des numéros ---
const ov = (a, b) => Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x) > 2 && Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y) > 2;
const par = {}; map.forEach((b) => (par[b.zone] ??= []).push(b));
for (const bs of Object.values(par)) for (let p = 0; p < 4; p++)
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], b = bs[j]; if (!ov(a, b)) continue;
    // Si le rectangle de l'un couvre le numéro de l'autre, c'est lui qui
    // déborde (pièce en L dont l'englobant mord sur la pièce voisine).
    const couvre = (p, q) => q.ax > p.x && q.ax < p.x + p.w && q.ay > p.y && q.ay < p.y + p.h;
    if (couvre(a, b) !== couvre(b, a)) {
      const trop = couvre(a, b) ? a : b, autre = couvre(a, b) ? b : a;
      if (autre.ax > trop.ax) trop.w = Math.max(1, autre.x - trop.x);
      else if (autre.ax < trop.ax) { const nx = autre.x + autre.w; trop.w -= nx - trop.x; trop.x = nx; }
      else if (autre.ay > trop.ay) trop.h = Math.max(1, autre.y - trop.y);
      else { const ny = autre.y + autre.h; trop.h -= ny - trop.y; trop.y = ny; }
      continue;
    }
    // Une forme issue du remplissage est fidèle au relevé : en cas de conflit
    // avec une forme de repli, c'est cette dernière qu'on rogne.
    if (a.src !== b.src) {
      const bon = a.src === "remplissage" ? a : b, appr = a.src === "remplissage" ? b : a;
      if (appr.ax >= bon.x + bon.w - 2) { const nx = bon.x + bon.w; appr.w -= nx - appr.x; appr.x = nx; }
      else if (appr.ax <= bon.x + 2) appr.w = bon.x - appr.x;
      else if (appr.ay >= bon.y + bon.h - 2) { const ny = bon.y + bon.h; appr.h -= ny - appr.y; appr.y = ny; }
      else appr.h = bon.y - appr.y;
      continue;
    }
    const ox = Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x), oy = Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
    if (oy >= ox) { const [g, d] = a.ax < b.ax ? [a, b] : [b, a]; if (d.x > g.x) g.w = d.x - g.x; }
    else { const [h, bas] = a.ay < b.ay ? [a, b] : [b, a]; if (bas.y > h.y) h.h = bas.y - h.y; }
  }
const rest = [];
for (const [z, bs] of Object.entries(par)) for (let i = 0; i < bs.length; i++) for (let j = i+1; j < bs.length; j++)
  if (ov(bs[i], bs[j])) rest.push(`${z} ${bs[i].numero}/${bs[j].numero}`);
const dehors = map.filter((b) => !(b.ax > b.x && b.ax < b.x+b.w && b.ay > b.y && b.ay < b.y+b.h));
console.error(`${map.length} box calés | recouvrements: ${rest.length ? rest.join(", ") : "aucun"} | hors emprise: ${dehors.length}`);
writeFileSync(new URL("./mapping-v3.json", import.meta.url), JSON.stringify(map, null, 2));
