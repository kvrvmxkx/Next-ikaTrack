"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Package,
  Layers,
  Users,
  Tag,
  Vault,
  Settings,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Roles } from "@/lib/enums";

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: string[];
}

const items: MenuItem[] = [
  {
    title: "Tableau de bord",
    url: "/tableau-de-bord",
    icon: LayoutDashboard,
    roles: [Roles.SUPER_ADMIN, Roles.AGENT_MALI, Roles.AGENT_CI, Roles.AGENT_CHINE],
  },
  {
    title: "Colis",
    url: "/colis",
    icon: Package,
    roles: [
      Roles.SUPER_ADMIN,
      Roles.AGENT_CHINE,
      Roles.AGENT_MALI,
      Roles.AGENT_CI,
    ],
  },
  {
    title: "Groupages",
    url: "/colis/groupe",
    icon: Layers,
    roles: [
      Roles.SUPER_ADMIN,
      Roles.AGENT_CHINE,
      Roles.AGENT_MALI,
      Roles.AGENT_CI,
    ],
  },
  {
    title: "Agents",
    url: "/utilisateurs",
    icon: Users,
    roles: [Roles.SUPER_ADMIN],
  },
  {
    title: "Tarifs",
    url: "/tarifs",
    icon: Tag,
    roles: [Roles.SUPER_ADMIN],
  },
  {
    title: "Caisse",
    url: "/caisse",
    icon: Vault,
    roles: [Roles.SUPER_ADMIN, Roles.AGENT_MALI, Roles.AGENT_CI],
  },
  {
    title: "Paramètres",
    url: "/parametres",
    icon: Settings,
    roles: [
      Roles.SUPER_ADMIN,
      Roles.AGENT_CHINE,
      Roles.AGENT_MALI,
      Roles.AGENT_CI,
    ],
  },
];

export function AppSidebar() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [etablissement, setEtablissement] = useState("CF AirCargo");

  useEffect(() => {
    fetch("/api/parametres")
      .then((r) => r.json())
      .then((d) => { if (d.etablissement) setEtablissement(d.etablissement); })
      .catch(() => {});
  }, []);

  async function logout() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });
  }

  const userRole = (session?.user as any)?.role ?? "";

  const filteredItems = items.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <Sidebar className="border-r-[.2px] border-sidebar-border/50">
      <SidebarHeader className="px-6 py-8">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-sidebar-foreground/40 mb-1">
            ikaTrack
          </p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/30">
            {etablissement}
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon size={16} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-6 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">
                        {(session?.user as any)?.firstname}{" "}
                        {(session?.user as any)?.lastname}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(session?.user as any)?.role?.replace("_", " ")}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/changer-mot-de-passe")}
                  >
                    Changer mon mot de passe
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <a href="/login">Connexion</a>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
