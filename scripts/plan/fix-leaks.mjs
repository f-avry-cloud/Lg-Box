import { readFileSync, writeFileSync } from "node:fs";
const map = JSON.parse(readFileSync(new URL("./mapping.json", import.meta.url), "utf8"));
const par = {}; for (const b of map) (par[b.zone] ??= []).push(b);

const overlap = (a, b) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 3 &&
  Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 3;

for (const bs of Object.values(par)) {
  const hs = bs.map((b) => b.h).sort((x, y) => x - y);
  const medH = hs[hs.length >> 1];
  const sains = bs.filter((b) => b.h <= medH * 1.5);
  // Décalage typique entre le haut du box et son numéro, mesuré sur les box sains.
  const offs = sains.map((b) => b.ay - b.y).sort((x, y) => x - y);
  const medOff = offs[offs.length >> 1];

  const recale = (b, why) => {
    b.y = Math.round(b.ay - medOff);
    b.h = Math.round(medH);
    b.recale = why;
  };

  for (const b of bs) if (b.h > medH * 1.9) recale(b, "hauteur");

  // Recouvrements restants : on recale le plus haut des deux (le plus suspect).
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      if (!overlap(bs[i], bs[j])) continue;
      const cible = bs[i].h >= bs[j].h ? bs[i] : bs[j];
      if (cible.recale === "recouvrement") continue;
      recale(cible, "recouvrement");
    }
  }
}

// Dernier passage : deux box mitoyens dont l'un mord sur l'autre. On recoupe
// à la frontière, en se fiant à la position des numéros pour savoir lequel
// des deux est en trop de ce côté.
for (const bs of Object.values(par)) {
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      if (!overlap(a, b)) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (oy >= ox) {
        // mitoyens gauche/droite : le box dont le numéro est à gauche s'arrête
        // là où commence l'autre.
        const [g, d] = a.ax < b.ax ? [a, b] : [b, a];
        if (d.x > g.x) { g.w = d.x - g.x; g.recale = "mitoyen"; }
      } else {
        const [h, bas] = a.ay < b.ay ? [a, b] : [b, a];
        if (bas.y > h.y) { h.h = bas.y - h.y; h.recale = "mitoyen"; }
      }
    }
  }
}

const restants = [];
for (const [zone, bs] of Object.entries(par)) {
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++)
    if (overlap(bs[i], bs[j])) restants.push(`${zone} ${bs[i].numero}/${bs[j].numero}`);
}
const recales = map.filter((b) => b.recale);
console.error(`${recales.length} box recalés : ${recales.map((b) => b.zone + " " + b.numero).join(", ")}`);
console.error(`recouvrements restants : ${restants.length ? restants.join(", ") : "aucun"}`);
const horsCadre = map.filter((b) => !(b.ax > b.x && b.ax < b.x + b.w && b.ay > b.y && b.ay < b.y + b.h));
console.error(`box ne contenant pas leur numéro : ${horsCadre.length}`);
writeFileSync(new URL("./mapping-fixed.json", import.meta.url), JSON.stringify(map, null, 2));
