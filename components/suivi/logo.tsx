import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * La marque LG BOX.
 *
 * Le logo d'origine est dessiné sur fond blanc, avec des séparations blanches
 * à l'intérieur du cube. Le poser en transparence sur le fond sable de l'app
 * ferait passer le sable dans ces séparations et changerait le dessin ; il
 * garde donc son fond, dans une tuile arrondie.
 */
export function Logo({ className, taille = 36 }: { className?: string; taille?: number }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white",
        className
      )}
      style={{ width: taille, height: taille }}
    >
      <Image
        src="/suivi/logo-256.png"
        alt="LG BOX"
        width={taille}
        height={taille}
        priority
        style={{ width: taille, height: taille }}
      />
    </span>
  );
}
