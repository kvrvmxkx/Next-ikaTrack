"use client";

import { useEffect, useState } from "react";
import { Package, Inbox, CheckCircle, AlertTriangle, CreditCard, CalendarDays, AlertCircle } from "lucide-react";
import KpiCard from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/status-badge";
import { amountFormatXOF, getDestinationText } from "@/lib/utils";
import { Roles } from "@/lib/enums";
import Link from "next/link";

type AgentData = {
  role: string;
  chine?: {
    enregistres: number;
    enCoursEnvoi: number;
    enTransit: number;
    totalMois: number;
    avancesJour: number;
  };
  destination?: {
    arriveAgence: number;
    pretRetirer: number;
    litigues: number;
    soldesEnAttente: number;
    nbColisAttentesPaiement: number;
    soldesJour: number;
    totalDetteActive: number;
    nbColisEnDette: number;
  };
  recentColis: {
    id: string; code: string; expediteurEstFournisseur: boolean; expediteurNom: string; destinataireNom: string;
    destination: string; poids: number; prixTotal: number; solde?: number;
    soldePaye?: boolean; remisEnDette?: boolean; statut: string; createdAt: string;
  }[];
};

export default function DashboardAgent({ role }: { role: string }) {
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tableau-de-bord/agent")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-48 bg-muted" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-background" />
          ))}
        </div>
        <div className="h-64 bg-muted" />
      </div>
    );
  }

  if (!data) return null;

  const titre =
    role === Roles.AGENT_CHINE
      ? "Vue Agence Chine"
      : role === Roles.AGENT_MALI
      ? "Vue Agence Mali"
      : "Vue Agence Côte d'Ivoire";

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <h1 className="text-sm font-bold uppercase tracking-[0.2em]">{titre}</h1>
      </div>

      {/* KPIs Agent Chine */}
      {data.chine && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border mt-px">
          <KpiCard title="En attente d'envoi"  icon={Package}      value={String(data.chine.enregistres)}  variant="warning" />
          <KpiCard title="En cours d'envoi"    icon={Package}      value={String(data.chine.enCoursEnvoi)} variant="default" />
          <KpiCard title="En transit"          icon={Package}      value={String(data.chine.enTransit)}    variant="default" />
          <KpiCard title="Colis ce mois"       icon={CalendarDays} value={String(data.chine.totalMois)} />
          <KpiCard title="Avances encaissées aujourd'hui" icon={CreditCard} value={amountFormatXOF(data.chine.avancesJour)} variant="success" />
        </div>
      )}

      {/* KPIs Agent Mali / CI */}
      {data.destination && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border mt-px">
          <KpiCard title="Colis arrivés en agence" icon={Inbox}       value={String(data.destination.arriveAgence)} variant="default" />
          <KpiCard title="Prêts à retirer"         icon={CheckCircle} value={String(data.destination.pretRetirer)}  variant="warning" />
          <KpiCard title="Litiges"                 icon={AlertTriangle} value={String(data.destination.litigues)}   variant="destructive" />
          <KpiCard
            title="Soldes en attente"
            icon={CreditCard}
            value={amountFormatXOF(data.destination.soldesEnAttente)}
            subtitle={`${data.destination.nbColisAttentesPaiement} colis`}
            variant="warning"
          />
          <KpiCard
            title="Soldes encaissés aujourd'hui"
            icon={CreditCard}
            value={amountFormatXOF(data.destination.soldesJour)}
            variant="success"
          />
          <KpiCard
            title="En dette"
            icon={AlertCircle}
            value={amountFormatXOF(data.destination.totalDetteActive)}
            subtitle={`${data.destination.nbColisEnDette} colis`}
            variant="destructive"
          />
        </div>
      )}

      {/* Colis récents */}
      <div className="border border-border mt-px overflow-x-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]">Colis récents</p>
          <Link href="/colis" className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            Voir tout
          </Link>
        </div>
        <div>
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Poids</TableHead>
                {data.destination && <TableHead className="text-right">Solde dû</TableHead>}
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.recentColis ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun colis</TableCell></TableRow>
              ) : (data.recentColis ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/colis/${c.code}`} className="font-mono text-xs hover:underline">{c.code}</Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{c.destinataireNom}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getDestinationText(c.destination)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{c.poids} kg</TableCell>
                  {data.destination && (
                    <TableCell className="text-right">
                      {c.soldePaye ? (
                        <span className="text-green-600 text-xs font-medium">Payé</span>
                      ) : c.remisEnDette ? (
                        <span className="text-red-500 text-xs font-bold">Dette {amountFormatXOF(c.solde ?? 0)}</span>
                      ) : (
                        <span className="font-medium">{amountFormatXOF(c.solde ?? 0)}</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-center"><StatusBadge statut={c.statut} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
