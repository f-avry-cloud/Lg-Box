import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { signInAdmin } from "@/lib/actions/auth";

export default function ConnexionPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex-col items-start gap-1">
          <CardTitle className="text-base">LG BOX — Back-office</CardTitle>
          <p className="text-xs text-muted-foreground">Réservé à l&apos;équipe LG BOX.</p>
        </CardHeader>
        <CardContent>
          <LoginForm action={signInAdmin} submitLabel="Se connecter" />
        </CardContent>
      </Card>
    </div>
  );
}
