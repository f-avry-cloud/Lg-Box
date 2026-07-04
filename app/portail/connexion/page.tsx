import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { signInTenant } from "@/lib/actions/auth";

export default function PortailConnexionPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle className="text-base">Mon espace LG BOX</CardTitle>
          <p className="text-xs text-muted-foreground">
            Connectez-vous avec les identifiants fournis lors de la signature de votre contrat.
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm action={signInTenant} submitLabel="Accéder à mon espace" />
        </CardContent>
      </Card>
    </div>
  );
}
