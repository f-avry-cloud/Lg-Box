// Rattache chaque pièce extraite du plan au box correspondant en base.
//  1. répare les emprises qui ont fui dans un couloir ;
//  2. découpe le rez-de-chaussée en 4 bâtiments par position horizontale ;
//  3. confronte chaque groupe à la liste réelle des numéros en base.
import { readFileSync, writeFileSync } from "node:fs";

const geo = JSON.parse(readFileSync(new URL("./rooms-geometry.json", import.meta.url), "utf8"));
const NON_BOX = /^(couloir|hall|vestibule|atelier|cave|chaufferie)$/i;

// Numéros réellement en base, par zone.
const DB = {
  "Bâtiment 1": "1,10,11,12,14,15,2a,2b,2c,4,5,6,7,8,9".split(","),
  "Bâtiment 2": "1,2,3,4,5,6,7,8,9".split(","),
  "Bâtiment 3": "1,10,11,2,22,3,4,8,9".split(","),
  "Bâtiment 4": "1,2,3,4a,4b,4c,5,6,7".split(","),
  "Étage": "1,10,10 bis,11,12,13,2,3,3bis,4,5,6,7,8,9,9A,9B,9C,9D".split(","),
  "Rez-de-jardin": "1,2,3,4,5,6".split(","),
};
const norm = (s) => s.toLowerCase().replace(/\s+/g, "");

// --- 1. réparation des fuites -------------------------------------------
// Une emprise qui a fui traverse un couloir. On la retaille sur la bande
// verticale qui ne recouvre aucun couloir du même niveau.
function repair(rooms) {
  const boxes = rooms.filter((r) => r.w && !NON_BOX.test(r.label));
  const hs = boxes.map((r) => r.h).sort((a, b) => a - b);
  const med = hs[Math.floor(hs.length / 2)];
  const sains = boxes.filter((r) => r.h <= med * 1.5);

  let fixed = 0, restants = [];
  for (const b of boxes) {
    if (b.h <= med * 1.9) continue;
    // Le box a fui à travers une porte et traverse plusieurs rangées. On le
    // retaille sur la rangée qui contient son étiquette, en reprenant la bande
    // verticale d'un voisin sain situé à la même hauteur.
    const voisin = sains.find((s) =>
      Math.min(b.x + b.w, s.x + s.w) - Math.max(b.x, s.x) > 3 &&
      b.ay > s.y && b.ay < s.y + s.h
    );
    if (voisin) { b.y = voisin.y; b.h = voisin.h; fixed++; }
    else restants.push(b.label);
  }
  return { fixed, restants };
}

for (const [niveau, rooms] of Object.entries(geo)) {
  const { fixed, restants } = repair(rooms);
  if (fixed || restants.length) {
    console.error(`${niveau}: ${fixed} emprise(s) recalée(s)` + (restants.length ? `, non résolues: ${restants.join(", ")}` : ""));
  }
}

// --- 2. découpage du RDC en bâtiments ------------------------------------
const rdc = geo.rdc.filter((r) => r.w && !NON_BOX.test(r.label));
rdc.sort((a, b) => a.x - b.x);

// Ancres sûres : 4a/4b/4c => Bâtiment 4, 2a/2b/2c => Bâtiment 1.
const xOf = (lbl) => rdc.filter((r) => norm(r.label) === lbl).map((r) => r.x);
const anchor4 = [...xOf("4a"), ...xOf("4b"), ...xOf("4c")];
const anchor1 = [...xOf("2a"), ...xOf("2b"), ...xOf("2c")];
console.error(`ancres — Bât 4 à x≈${Math.min(...anchor4).toFixed(0)}, Bât 1 à x≈${Math.min(...anchor1).toFixed(0)}`);

// Ordre gauche→droite, confirmé par les ancres : Bât 4 à gauche, Bât 1 à droite.
const ordre = ["Bâtiment 4", "Bâtiment 3", "Bâtiment 2", "Bâtiment 1"];

// Les bâtiments ne sont pas séparés par des écarts francs : découper aux plus
// grands trous se trompe. On cherche donc les 3 coupures telles que CHAQUE
// groupe reproduise exactement la liste des numéros du bâtiment correspondant
// en base — critère bien plus sûr qu'une heuristique de distance.
const sameSet = (a, b) => {
  const x = [...a].sort(), y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

// Les pièces présentes sur le plan mais absentes de la base (ex. 4D) sont
// écartées du découpage et signalées à part.
const connus = new Set(Object.values(DB).flat().map(norm));
const horsBase = rdc.filter((r) => !connus.has(norm(r.label)));
const aPlacer = rdc.filter((r) => connus.has(norm(r.label)));
if (horsBase.length) {
  console.error("sur le plan mais absents de la base : " + horsBase.map((r) => `${r.label}@x${r.x.toFixed(0)}`).join(", "));
}

let solution = null;
const n = aPlacer.length;
for (let i = 1; i < n - 2 && !solution; i++) {
  for (let j = i + 1; j < n - 1 && !solution; j++) {
    for (let k = j + 1; k < n && !solution; k++) {
      const parts = [aPlacer.slice(0, i), aPlacer.slice(i, j), aPlacer.slice(j, k), aPlacer.slice(k)];
      if (parts.every((p, idx) => sameSet(p.map((r) => norm(r.label)), DB[ordre[idx]].map(norm)))) {
        solution = parts;
      }
    }
  }
}

if (!solution) {
  console.error("\nAucun découpage ne reproduit exactement les 4 bâtiments — arrêt.");
  process.exit(1);
}
const clusters = solution;
clusters.forEach((c, i) => {
  console.error(`${ordre[i]} : x ${c[0].x.toFixed(0)} → ${Math.max(...c.map((r) => r.x + r.w)).toFixed(0)} (${c.length} box)`);
});

console.error("\n--- confrontation avec la base ---");
const mapping = [];
const problemes = [];

function check(zone, extracted) {
  const attendus = DB[zone].map(norm);
  const trouves = extracted.map((r) => norm(r.label));
  const manquants = attendus.filter((n) => !trouves.includes(n));
  const enTrop = trouves.filter((n) => !attendus.includes(n));
  const dupes = trouves.filter((n, i) => trouves.indexOf(n) !== i);
  const ok = !manquants.length && !enTrop.length && !dupes.length;
  console.error(`${zone.padEnd(14)} plan ${String(extracted.length).padStart(2)} / base ${String(attendus.length).padStart(2)}  ${ok ? "✓ concordance exacte" : ""}`);
  if (manquants.length) console.error(`   absents du plan : ${manquants.join(", ")}`);
  if (enTrop.length) console.error(`   absents de la base : ${enTrop.join(", ")}`);
  if (dupes.length) console.error(`   doublons dans le plan : ${dupes.join(", ")}`);
  if (!ok) problemes.push(zone);

  for (const r of extracted) {
    const n = norm(r.label);
    if (attendus.includes(n)) {
      mapping.push({ zone, numero: DB[zone][attendus.indexOf(n)], x: r.x, y: r.y, w: r.w, h: r.h });
    }
  }
}

clusters.forEach((c, i) => check(ordre[i], c));
check("Étage", geo.etage.filter((r) => r.w && !NON_BOX.test(r.label)));
check("Rez-de-jardin", geo["sous-sol"].filter((r) => r.w && !NON_BOX.test(r.label)));

writeFileSync(new URL("./mapping.json", import.meta.url), JSON.stringify(mapping, null, 2));
console.error(`\n${mapping.length} box rattachés / 67 en base` + (problemes.length ? ` — zones à revoir : ${problemes.join(", ")}` : " — tout concorde"));
