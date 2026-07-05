"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/result";

export function GeneratePdfButton({
  action,
  label = "Générer le PDF",
}: {
  action: () => Promise<ActionResult & { path?: string }>;
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
          const result = await action();
          if (!result.success) {
            toast.error(result.error ?? "Échec de la génération.");
            return;
          }
          toast.success("PDF généré.");
          router.refresh();
        })
      }
    >
      <FileText /> {pending ? "Génération..." : label}
    </Button>
  );
}
