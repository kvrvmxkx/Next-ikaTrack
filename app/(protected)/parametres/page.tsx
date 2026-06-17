"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, ShieldCheck, Globe, Building2, Power } from "lucide-react";
import { getFormSettings, saveFormSettings, getActiveDestination, saveActiveDestination, type FormSettings, type ActiveDestination } from "@/lib/form-settings";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Roles, isAdmin } from "@/lib/enums";

type AppSettings = { agentsCanEditColis: boolean; agentsCanDeleteColis: boolean; maintenanceMode: boolean; etablissement: string };

const CHAMPS = [
  {
    key: "afficherDescription" as const,
    label: "Description du contenu",
    description: "Champ libre pour décrire le contenu du colis.",
  },
  {
    key: "afficherVille" as const,
    label: "Ville du destinataire",
    description: "Ville de livraison du destinataire.",
  },
  {
    key: "afficherAdresse" as const,
    label: "Adresse du destinataire",
    description: "Adresse détaillée (quartier, rue…) du destinataire.",
  },
  {
    key: "afficherNotes" as const,
    label: "Notes internes",
    description: "Remarques internes visibles uniquement par les agents.",
  },
];

export default function ParametresPage() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role ?? "";
  const isSuperAdmin = isAdmin(role);
  const isRealSuperAdmin = role === Roles.SUPER_ADMIN;

  const [settings, setSettings] = useState<FormSettings | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [activeDestination, setActiveDestination] = useState<ActiveDestination>("MALI");
  const [etablissementInput, setEtablissementInput] = useState("");
  const etablissementSaving = useRef(false);

  useEffect(() => {
    setSettings(getFormSettings());
    setActiveDestination(getActiveDestination());
    fetch("/api/parametres").then((r) => r.json()).then((d) => {
      setAppSettings(d);
      setEtablissementInput(d.etablissement ?? "CF AirCargo");
    });
  }, []);

  function changeDestination(dest: ActiveDestination) {
    setActiveDestination(dest);
    saveActiveDestination(dest);
    toast.success("Pays actif mis à jour", { position: "bottom-right" });
  }

  function toggle(key: keyof FormSettings) {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveFormSettings(next);
    toast.success("Paramètre mis à jour", { position: "bottom-right" });
  }

  async function saveEtablissement() {
    if (etablissementSaving.current) return;
    etablissementSaving.current = true;
    await fetch("/api/parametres", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etablissement: etablissementInput.trim() }),
    });
    etablissementSaving.current = false;
    toast.success("Établissement mis à jour", { position: "bottom-right" });
  }

  async function toggleAppSetting(key: keyof AppSettings) {
    if (!appSettings) return;
    const next = { ...appSettings, [key]: !appSettings[key] };
    setAppSettings(next);
    await fetch("/api/parametres", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
    toast.success("Paramètre mis à jour", { position: "bottom-right" });
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-sm font-bold uppercase tracking-[0.2em]">Paramètres</h1>

      {/* Pays actif */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Pays actif
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Toutes les données seront filtrées selon ce pays.
          </p>
        </CardHeader>
        <CardContent className="flex gap-3">
          {([["MALI", "Mali"], ["COTE_DIVOIRE", "Côte d'Ivoire"]] as [ActiveDestination, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => changeDestination(key)}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] border transition-colors ${
                activeDestination === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Établissement — Admin uniquement */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Établissement
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Nom de l&apos;établissement utilisé dans les SMS et communications.
            </p>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              value={etablissementInput}
              onChange={(e) => setEtablissementInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEtablissement()}
              placeholder="CF AirCargo"
              className="flex-1"
            />
            <Button variant="outline" onClick={saveEtablissement}>
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Permissions agents — Admin uniquement */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Permissions des agents
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Contrôlez ce que les agents peuvent faire sur les colis.
            </p>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {appSettings === null ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="py-4 flex items-center justify-between animate-pulse">
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 bg-muted rounded" />
                    <div className="h-3 w-56 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-10 bg-muted rounded-full" />
                </div>
              ))
            ) : (
              <>
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Modifier les colis</p>
                    <p className="text-xs text-muted-foreground">Les agents peuvent éditer les informations d&apos;un colis.</p>
                  </div>
                  <Switch
                    checked={appSettings.agentsCanEditColis}
                    onCheckedChange={() => toggleAppSetting("agentsCanEditColis")}
                  />
                </div>
                <div className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Supprimer les colis</p>
                    <p className="text-xs text-muted-foreground">Les agents peuvent supprimer un colis de la liste.</p>
                  </div>
                  <Switch
                    checked={appSettings.agentsCanDeleteColis}
                    onCheckedChange={() => toggleAppSetting("agentsCanDeleteColis")}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mode maintenance — SUPER_ADMIN uniquement */}
      {isRealSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Power className="w-4 h-4" />
              Maintenance
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Rend l&apos;application inaccessible à tous les utilisateurs sauf vous.
            </p>
          </CardHeader>
          <CardContent>
            {appSettings === null ? (
              <div className="py-4 flex items-center justify-between animate-pulse">
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-muted rounded" />
                  <div className="h-3 w-56 bg-muted rounded" />
                </div>
                <div className="h-6 w-10 bg-muted rounded-full" />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Application indisponible</p>
                  <p className="text-xs text-muted-foreground">
                    {appSettings.maintenanceMode
                      ? "L'application est actuellement en maintenance."
                      : "L'application est accessible normalement."}
                  </p>
                </div>
                <Switch
                  checked={appSettings.maintenanceMode}
                  onCheckedChange={() => toggleAppSetting("maintenanceMode")}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Champs formulaire */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Champs du formulaire
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Choisissez les champs à afficher lors de la création d&apos;un colis.
          </p>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {settings === null ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-4 flex items-center justify-between animate-pulse">
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-muted rounded" />
                  <div className="h-3 w-56 bg-muted rounded" />
                </div>
                <div className="h-6 w-10 bg-muted rounded-full" />
              </div>
            ))
          ) : (
            CHAMPS.map(({ key, label, description }) => (
              <div key={key} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch checked={settings[key]} onCheckedChange={() => toggle(key)} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
