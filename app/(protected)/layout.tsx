import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Nav from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";
import { isMaintenanceMode } from "@/lib/settings";
import { Roles } from "@/lib/enums";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as any).role;
  if (userRole !== Roles.SUPER_ADMIN && await isMaintenanceMode()) {
    redirect("/maintenance");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full p-4">
        <Nav />
        {children}
        <Toaster />
      </main>
    </SidebarProvider>
  );
}
