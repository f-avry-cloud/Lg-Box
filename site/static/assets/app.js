/* =========================================================================
   LG BOX — comportements du site public.
   Vanilla, sans dépendance, chargé en `defer`. Tout est facultatif : sans
   JavaScript la page reste lisible et complète.
   ========================================================================= */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.documentElement.classList.add("is-ready");

  /* --- Apparition au défilement ------------------------------------- */
  const reveals = $$(".reveal");
  if (calm || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          io.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* --- En-tête collant ---------------------------------------------- */
  const hdr = $(".hdr");
  if (hdr) {
    const onScroll = () => hdr.classList.toggle("is-stuck", window.scrollY > 24);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
  }

  /* --- Menu mobile --------------------------------------------------- */
  const burger = $(".burger");
  const nav = $(".nav");
  if (burger && nav) {
    burger.addEventListener("click", () => {
      const open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", (e) => {
      if (e.target.tagName !== "A") return;
      burger.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    });
  }

  /* --- Compteurs ----------------------------------------------------- */
  const counters = $$("[data-count]");
  if (counters.length) {
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const decimals = (el.dataset.count.split(",")[1] || "").length;
      if (calm) {
        el.textContent = target.toFixed(decimals).replace(".", ",") + suffix;
        return;
      }
      const dur = 1100;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals).replace(".", ",") + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      const co = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            run(e.target);
            co.unobserve(e.target);
          });
        },
        { threshold: 0.6 }
      );
      counters.forEach((el) => co.observe(el));
    } else {
      counters.forEach(run);
    }
  }

  /* --- Sélecteur de surface ------------------------------------------ */
  const sizer = $("[data-sizer]");
  if (sizer) {
    const range = $("input[type=range]", sizer);
    const out = $("[data-sizer-val]", sizer);
    const price = $("[data-sizer-price]", sizer);
    const fits = $("[data-sizer-fits]", sizer);
    const box = $(".room__box", sizer);
    const boxLabel = $(".room__box span", sizer);
    const steps = JSON.parse(sizer.dataset.sizer);

    const paint = () => {
      const i = Number(range.value);
      const s = steps[i];
      range.style.setProperty("--pct", (i / (steps.length - 1)) * 100 + "%");
      range.setAttribute("aria-valuetext", s.m2 + " mètres carrés");
      out.innerHTML = s.m2 + '<sup>m²</sup>';
      price.firstChild.textContent = "≈ " + s.prix + " €/mois";
      box.style.setProperty("--w", 26 + (s.m2 / 20) * 58 + "%");
      boxLabel.textContent = s.m2 + " m²";
      fits.innerHTML = "";
      s.fits.forEach((f, n) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.style.animationDelay = n * 45 + "ms";
        chip.textContent = f;
        fits.appendChild(chip);
      });
    };
    range.addEventListener("input", paint);
    paint();
  }

  /* --- Carrousel d'avis : glisser à la souris ------------------------ */
  $$(".rail").forEach((rail) => {
    let down = false, x0 = 0, left0 = 0;
    rail.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      down = true; x0 = e.clientX; left0 = rail.scrollLeft;
      rail.classList.add("is-drag");
    });
    const stop = () => { down = false; rail.classList.remove("is-drag"); };
    rail.addEventListener("pointerup", stop);
    rail.addEventListener("pointerleave", stop);
    rail.addEventListener("pointermove", (e) => {
      if (!down) return;
      rail.scrollLeft = left0 - (e.clientX - x0);
    });
  });

  /* --- Un seul volet de FAQ ouvert à la fois -------------------------- */
  const qas = $$(".qa");
  qas.forEach((qa) =>
    qa.addEventListener("toggle", () => {
      if (!qa.open) return;
      qas.forEach((other) => { if (other !== qa) other.open = false; });
    })
  );

  /* --- Barre d'action mobile ----------------------------------------- */
  const dock = $(".dock");
  if (dock) {
    const toggle = () => dock.classList.toggle("is-on", window.scrollY > 520);
    toggle();
    addEventListener("scroll", toggle, { passive: true });
  }

  /* --- Photos manquantes : on garde le dégradé plutôt qu'une icône cassée */
  $$(".shot img").forEach((img) => {
    const fail = () => img.closest(".shot").classList.add("shot--void");
    img.addEventListener("error", fail);
    if (img.complete && img.naturalWidth === 0) fail();
  });

  /* --- Parallaxe douce du mur de box (souris, desktop) ---------------- */
  const wall = $(".wall");
  if (wall && !calm && matchMedia("(pointer: fine)").matches) {
    const hero = wall.closest(".hero");
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      wall.style.transform =
        `perspective(1200px) rotateY(${-7 + dx * 8}deg) rotateX(${3 - dy * 7}deg)`;
    });
    hero.addEventListener("pointerleave", () => {
      wall.style.transform = "";
    });
  }

  /* --- Année courante dans le pied de page ---------------------------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
