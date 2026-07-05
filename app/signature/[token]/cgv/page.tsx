import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSignatureTokenValid } from "@/lib/business/contract-signature";
import { createServiceClient } from "@/lib/supabase/server";

// Page publique, accessible via le même token que /signature/[token] : les
// conditions générales sont consultables via un lien, séparément de la
// fenêtre de signature du contrat (elles ne sont pas signées séparément —
// leur acceptation est couverte par la signature du contrat lui-même).
export default async function SignatureCgvPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: request } = await service
    .from("signature_requests")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle();

  if (!request || !isSignatureTokenValid(request).valid) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-2 p-6 text-center">
        <h1 className="text-lg font-semibold">Lien invalide</h1>
        <p className="text-sm text-muted-foreground">
          Ce lien n&apos;est plus valide. Contactez-nous pour en recevoir un nouveau.
        </p>
      </div>
    );
  }

  const { data: company } = await service.from("company_settings").select("*").single();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div>
        <Link href={`/signature/${token}`} className="text-sm underline underline-offset-2">
          ← Retour à la signature
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Conditions générales de location</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-line text-sm leading-relaxed">
          {company?.cgv ?? "Conditions générales de location à compléter dans les paramètres du back-office."}
        </CardContent>
      </Card>
    </div>
  );
}
