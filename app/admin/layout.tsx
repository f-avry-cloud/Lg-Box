import { LogOut } from "lucide-react";

import { SidebarNav } from "@/components/admin/sidebar-nav";
import { requireStaff } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
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
    <div className="flex h-screen">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border p-4">
          <p className="font-semibold text-primary">LG BOX</p>
          <p className="text-[11px] text-muted-foreground">Back-office self-stockage</p>
        </div>
        <SidebarNav role={profile.role} />
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Occupation</span>
            <span>{occupancy}%</span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${occupancy}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border p-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{profile.email}</p>
            <p className="text-[11px] capitalize text-muted-foreground">{profile.role}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Se déconnecter"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
