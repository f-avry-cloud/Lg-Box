import Image from "next/image";

import { photo, type CleDePhoto } from "@/lib/site/photos";

export function Photo({
  cle,
  forme = "carre",
  tailles = "(max-width: 54rem) 100vw, 33vw",
  prioritaire = false,
}: {
  cle: CleDePhoto;
  forme?: "ouverture" | "large" | "carre";
  tailles?: string;
  prioritaire?: boolean;
}) {
  const { src, alt } = photo(cle);
  return (
    <div className={`s-photo s-photo--${forme}`}>
      <Image src={src} alt={alt} fill sizes={tailles} priority={prioritaire} />
    </div>
  );
}
