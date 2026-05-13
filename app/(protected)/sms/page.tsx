"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MessageSquare, Webhook, BarChart2, ShoppingCart, Wifi } from "lucide-react";

type Contract = {
  id: string; country: string; availableUnits: number; status: string;
  expirationDate: string; creationDate: string; offerName: string;
};
type PurchaseOrder = {
  id: string; country: string; bundleDescription: string; price: number;
  currency: string; purchaseDate: string; oldAvailableUnits: number; newAvailableUnits: number;
};
type Stat = {
  country: string; usage: number; nbEnforcements: number;
};
type AdminData = {
  contracts: Contract[];
  purchaseorders: PurchaseOrder[];
  statistics: {
    partnerStatistics: {
      statistics: {
        service: string;
        serviceStatistics: { country: string; countryStatistics: { appid: string; usage: number; nbEnforcements: number }[] }[];
      }[];
    };
  };
};

const COUNTRY_LABELS: Record<string, string> = {
  MLI: "Mali", CIV: "Côte d'Ivoire", SEN: "Sénégal",
  CMR: "Cameroun", BFA: "Burkina Faso", GIN: "Guinée",
};

const STATUS_VARIANT: Record<string, "default" | "destructive" | "outline"> = {
  ACTIVE: "default", EXPIRED: "destructive", INACTIVE: "outline",
};

function countryLabel(code: string) {
  return COUNTRY_LABELS[code] ?? code;
}

function flattenStats(data: AdminData["statistics"]): Stat[] {
  const stats: Stat[] = [];
  for (const s of data.partnerStatistics?.statistics ?? []) {
    for (const ss of s.serviceStatistics ?? []) {
      const usage = ss.countryStatistics.reduce((sum, c) => sum + c.usage, 0);
      const enforcements = ss.countryStatistics.reduce((sum, c) => sum + c.nbEnforcements, 0);
      stats.push({ country: ss.country, usage, nbEnforcements: enforcements });
    }
  }
  return stats;
}

export default function SmsAdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
  const webhookUrl = `${appUrl}/api/sms/webhook`;

  useEffect(() => {
    fetch("/api/sms/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const stats = data ? flattenStats(data.statistics) : [];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-1">Orange SMS</p>
          <h1 className="text-sm font-bold uppercase tracking-[0.2em]">Administration SMS</h1>
        </div>
      </div>

      {error && (
        <div className="mt-4 px-4 py-3 border border-destructive text-destructive text-sm">
          Erreur Orange API : {error}
        </div>
      )}

      {/* ── Delivery Receipt ── */}
      <div className="mt-px border border-border">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Webhook size={14} className="text-muted-foreground" />
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]">Delivery Receipt</p>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Orange envoie une notification de livraison (DR) pour chaque SMS dans les 24h.
            Enregistre l'URL ci-dessous sur{" "}
            <span className="font-medium text-foreground">developer.orange.com → MyApps → ton app → Delivery Receipt URL</span>.
          </p>

          {isLocalhost ? (
            <div className="border border-yellow-400 bg-yellow-50 px-4 py-3 text-yellow-800 text-xs space-y-1">
              <p className="font-bold uppercase tracking-wider">Indisponible en développement</p>
              <p>Orange exige une URL HTTPS avec certificat valide. Le webhook ne peut être enregistré qu'une fois l'application déployée en production.</p>
              <p className="font-mono text-yellow-600 mt-1">{webhookUrl}</p>
            </div>
          ) : (
            <div className="bg-muted border border-border px-4 py-3 flex items-center justify-between gap-4">
              <p className="font-mono text-xs break-all">{webhookUrl}</p>
              <button
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Copier
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
            {[
              { status: "DeliveredToTerminal", label: "Livré au terminal", color: "text-green-600" },
              { status: "DeliveredToNetwork",  label: "Livré au réseau",   color: "text-blue-500" },
              { status: "DeliveryUncertain",   label: "Statut incertain",  color: "text-yellow-500" },
              { status: "DeliveryImpossible",  label: "Échec livraison",   color: "text-red-500" },
            ].map((s) => (
              <div key={s.status} className="bg-background px-4 py-3">
                <p className={`text-[10px] font-bold ${s.color}`}>{s.status}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            Note Orange : un statut «DeliveryImpossible» ne garantit pas que le SMS n'a pas été reçu.
            Aucun remboursement n'est accordé sur ce statut.
          </p>
        </div>
      </div>

      {/* ── Solde & Contrats ── */}
      <div className="mt-px border border-border">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Wifi size={14} className="text-muted-foreground" />
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]">Solde & Contrats</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-background p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          ) : (data?.contracts ?? []).length === 0 ? (
            <div className="bg-background p-5 col-span-3 text-sm text-muted-foreground">
              Aucun contrat trouvé
            </div>
          ) : (
            (data?.contracts ?? []).map((c) => (
              <div key={c.id} className="bg-background p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    {countryLabel(c.country)}
                  </p>
                  <Badge variant={STATUS_VARIANT[c.status] ?? "outline"} className="text-[9px]">
                    {c.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-3xl font-bold font-display tabular-nums">{c.availableUnits}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">SMS disponibles</p>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t border-border space-y-0.5">
                  <p>Offre : <span className="text-foreground font-medium">{c.offerName}</span></p>
                  <p>Expire : <span className="text-foreground font-medium">
                    {new Date(c.expirationDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span></p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Statistiques d'usage ── */}
      <div className="mt-px border border-border">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <BarChart2 size={14} className="text-muted-foreground" />
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]">Statistiques d'usage</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pays</TableHead>
                <TableHead className="text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">SMS envoyés</TableHead>
                <TableHead className="text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Requêtes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 3 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-[10px] uppercase tracking-widest">
                    Aucune statistique
                  </TableCell>
                </TableRow>
              ) : stats.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{countryLabel(s.country)}</TableCell>
                  <TableCell className="text-right font-bold font-display tabular-nums">{s.usage}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{s.nbEnforcements}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Historique des achats ── */}
      <div className="mt-px border border-border">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <ShoppingCart size={14} className="text-muted-foreground" />
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]">Historique des achats</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Date</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Pays</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Bundle</TableHead>
                <TableHead className="text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">SMS ajoutés</TableHead>
                <TableHead className="text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Prix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (data?.purchaseorders ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-[10px] uppercase tracking-widest">
                    Aucun achat
                  </TableCell>
                </TableRow>
              ) : (
                [...(data?.purchaseorders ?? [])].reverse().map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(p.purchaseDate).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>{countryLabel(p.country)}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{p.bundleDescription}</TableCell>
                    <TableCell className="text-right font-bold font-display tabular-nums">
                      +{p.newAvailableUnits - p.oldAvailableUnits}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium whitespace-nowrap">
                      {p.price.toLocaleString("fr-FR")} {p.currency}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
