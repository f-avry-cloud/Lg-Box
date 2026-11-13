"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PAGES } from "@/lib/site/pages";


export function Liens() {
  const chemin = usePathname();
  return (
    <>
      {PAGES.map((p) => (
        <Link key={p.href} href={p.href} aria-current={chemin === p.href ? "page" : undefined}>
          {p.nom}
        </Link>
      ))}
    </>
  );
}
