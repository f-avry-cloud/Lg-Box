import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReservationStatusSelect } from "@/components/reservations/reservation-status-select";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data: reservations } = await supabase
    .from("reservation_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Demandes de réservation</h1>
        <p className="text-sm text-muted-foreground">
          Traitez les demandes reçues depuis la page publique, puis créez le contrat correspondant
          depuis le module{" "}
          <Link href="/admin/contracts" className="text-primary hover:underline">
            Contrats
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Taille souhaitée</TableHead>
                <TableHead>Date souhaitée</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Reçue le</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reservations ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nom}</TableCell>
                  <TableCell>
                    <div>{r.email}</div>
                    <div className="text-xs text-muted-foreground">{r.telephone}</div>
                  </TableCell>
                  <TableCell>{r.taille_souhaitee ?? "—"}</TableCell>
                  <TableCell>{r.date_souhaitee ? formatDate(r.date_souhaitee) : "—"}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">{r.message}</TableCell>
                  <TableCell>{formatDate(r.created_at)}</TableCell>
                  <TableCell>
                    <ReservationStatusSelect id={r.id} status={r.statut} />
                  </TableCell>
                </TableRow>
              ))}
              {(!reservations || reservations.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Aucune demande de réservation.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
