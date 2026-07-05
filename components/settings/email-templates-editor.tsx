"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateEmailTemplate } from "@/lib/actions/settings";
import type { EmailTemplate, EmailTemplateKey } from "@/types/database";

const LABELS: Record<EmailTemplateKey, string> = {
  "j-3": "J-3 (rappel avant échéance)",
  j0: "Jour J (échéance)",
  "j+7": "J+7 (relance)",
  "j+15": "J+15 (mise en demeure)",
  invoice_ready: "Facture disponible",
  contract_signature_request: "Contrat à signer",
  contract_signature_reminder: "Relance de signature",
};

const VARIABLES = [
  "{{prenom}}",
  "{{montant}}",
  "{{numero_facture}}",
  "{{date_echeance}}",
  "{{lien_portail}}",
  "{{lien_signature}}",
];

function TemplateForm({ template }: { template: EmailTemplate }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>Sujet</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Corps du message</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
      </div>
      <Button
        size="sm"
        className="w-fit"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateEmailTemplate(template.key, subject, body);
            if (!result.success) {
              toast.error(result.error ?? "Erreur.");
              return;
            }
            toast.success("Modèle enregistré.");
          })
        }
      >
        {pending ? "Enregistrement..." : "Enregistrer ce modèle"}
      </Button>
    </div>
  );
}

export function EmailTemplatesEditor({ templates }: { templates: EmailTemplate[] }) {
  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun modèle trouvé — exécutez <code>supabase/migrations/003_v1_2.sql</code> pour les créer.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Variables disponibles : {VARIABLES.join(" ")}
      </p>
      <Tabs defaultValue={templates[0].key}>
        <TabsList className="flex-wrap">
          {templates.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {LABELS[t.key]}
            </TabsTrigger>
          ))}
        </TabsList>
        {templates.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            <TemplateForm template={t} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
