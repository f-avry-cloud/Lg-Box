import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireStaff();
  const supabase = await createClient();
  const { count: totalUnits } = await supabase
    .from("units")
    .select("id", { count: "exact", head: true });
  const { count: loues } = await supabase
    .from("units")
    .select("id", { count: "exact", head: true })
    .eq("statut", "loue");

  const occupancy = totalUnits ? Math.round(((loues ?? 0) / totalUnits) * 100) : 0;

  return (
    <AdminShell role={profile.role} email={profile.email} occupancy={occupancy}>
      {children}
    </AdminShell>
  );
}
