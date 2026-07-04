"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

export function GeneratePdfButton({
  action,
  label = "Générer le PDF",
}: {
  action: () => Promise<string>;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await action();
            toast.success("PDF généré.");
            router.refresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Échec de la génération.");
          }
        })
      }
    >
      <FileText /> {pending ? "Génération..." : label}
    </Button>
  );
}
