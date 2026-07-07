"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Filtre générique piloté par un paramètre d'URL (ex. ?annee=2026&categorie=Assurance) —
// permet de combiner plusieurs filtres indépendants sans état côté serveur,
// et de conserver le filtre au rechargement / partage de lien.
export function SearchParamSelect({
  paramName,
  options,
  className,
}: {
  paramName: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? options[0]?.value ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
