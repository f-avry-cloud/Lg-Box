"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeAverageTenantDistance, type DistanceStatsResult } from "@/lib/actions/distance-stats";

export function DistanceStatCard() {
  const [result, setResult] = useState<DistanceStatsResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distance moyenne des locataires</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        {result?.success ? (
          <div>
            <p className="text-xl font-semibold">{result.averageKm} km</p>
            <p className="text-xs text-muted-foreground">
              {result.tenantsUsed} locataire(s) pris en compte
              {result.tenantsSkipped ? `, ${result.tenantsSkipped} ignoré(s) (ville manquante)` : ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Distance à vol d&apos;oiseau moyenne entre le site et la ville de résidence de chaque
            locataire actif.
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await computeAverageTenantDistance();
              setResult(res);
              if (!res.success) toast.error(res.error ?? "Erreur.");
            })
          }
        >
          {pending ? "Calcul..." : "Calculer"}
        </Button>
      </CardContent>
    </Card>
  );
}
