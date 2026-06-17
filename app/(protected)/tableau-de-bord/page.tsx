"use client";

import { authClient } from "@/lib/auth-client";
import { isAdmin } from "@/lib/enums";
import DashboardSuperAdmin from "@/components/dashboard/dashboard-super-admin";
import DashboardAgent from "@/components/dashboard/dashboard-agent";

export default function TableauDeBordPage() {
  const { data: session, isPending } = authClient.useSession();
  const role = (session?.user as any)?.role;

  if (isPending) {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (isAdmin(role)) {
    return <DashboardSuperAdmin />;
  }

  return <DashboardAgent role={role} />;
}
