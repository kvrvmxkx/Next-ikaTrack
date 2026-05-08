"use client";

import { useEffect, useState } from "react";
import {
  Package, Clock, CheckCircle, XCircle, TrendingUp,
  CalendarDays, Users, AlertTriangle, AlertCircle,
} from "lucide-react";
import { getActiveDestination } from "@/lib/form-settings";
import KpiCard from "@/components/kpi-card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { amountFormatXOF, getDestinationText } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/status-badge";

type DashboardData = {
  colis: {
    total: number; enregistre: number; enTransit: number; livre: number;
    annule: number; litige: number; revenusAttendus: number; revenusEncaisses: number;
    totalDetteActive: number; nbColisEnDette: number;
  };
  agents: { total: number };
  aujourd_hui: { count: number; poids: number };
  recentColis: {
    id: string; code: string; expediteurEstFournisseur: boolean; expediteurNom: string; destinataireNom: string;
    destination: string; poids: number; prixTotal: number; statut: string; createdAt: string;
  }[];
  monthlyData: { month: string; count: number; revenus: number }[];
};

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function DashboardSuperAdmin() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const dest = getActiveDestination();
    fetch(`/api/tableau-de-bord?destination=${dest}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-5 w-40 bg-muted" />
        <div className="border-y border-border py-8 space-y-3">
          <div className="h-4 w-32 bg-muted" />
          <div className="h-14 w-80 bg-muted" />
          <div className="h-4 w-64 bg-muted" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-background" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const pieData = [
    { name: "Enregistrés", value: data.colis.enregistre },
    { name: "En transit",  value: data.colis.enTransit },
    { name: "Livrés",      value: data.colis.livre },
    { name: "Annulés",     value: data.colis.annule },
    { name: "Litiges",     value: data.colis.litige },
  ];

  const recouvrement =
    data.colis.revenusAttendus > 0
      ? Math.round((data.colis.revenusEncaisses / data.colis.revenusAttendus) * 100)
      : 0;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <h1 className="text-sm font-bold uppercase tracking-[0.2em]">
          Tableau de bord
        </h1>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hidden sm:block">
          {today}
        </p>
      </div>

      {/* ── Revenue Section ── */}
      <div className="py-10 border-b border-border">
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-4">
          Revenus encaissés
        </p>
        <p className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display tabular-nums leading-none break-all">
          {amountFormatXOF(data.colis.revenusEncaisses)}
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 mt-6 text-sm">
          <span className="text-muted-foreground">
            Attendus{" "}
            <span className="text-foreground font-bold font-display">
              {amountFormatXOF(data.colis.revenusAttendus)}
            </span>
          </span>
          <span className="text-muted-foreground">
            En attente{" "}
            <span className="text-foreground font-bold font-display">
              {amountFormatXOF(data.colis.revenusAttendus - data.colis.revenusEncaisses)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Recouvrement{" "}
            <span className="text-foreground font-bold font-display">
              {recouvrement}%
            </span>
          </span>
        </div>
      </div>

      {/* ── KPI Grid — joined borders ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mt-px">
        <KpiCard title="Total colis"       icon={Package}       value={String(data.colis.total)}                     subtitle={`${data.colis.enTransit} en transit`} />
        <KpiCard title="Livrés"            icon={CheckCircle}   value={String(data.colis.livre)}                     variant="success" />
        <KpiCard title="Litiges"           icon={AlertTriangle} value={String(data.colis.litige)}                    variant="warning" />
        <KpiCard title="En dette"          icon={AlertCircle}   value={amountFormatXOF(data.colis.totalDetteActive)} subtitle={`${data.colis.nbColisEnDette} colis`}  variant="destructive"/>
        <KpiCard title="En transit"        icon={Clock}         value={String(data.colis.enTransit)} />
        <KpiCard title="Enregistrés"       icon={TrendingUp}    value={String(data.colis.enregistre)}                subtitle="En attente de transit" />
        <KpiCard title="Colis aujourd'hui" icon={CalendarDays}  value={String(data.aujourd_hui.count)}               subtitle={`${data.aujourd_hui.poids} kg`} />
        <KpiCard title="Agents"            icon={Users}         value={String(data.agents.total)} />
        
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border mt-px">
        <div className="bg-background p-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-1">
            Répartition
          </p>
          <p className="text-sm font-bold uppercase tracking-wider mb-4">Par statut</p>
          <ChartContainer config={{}} className="h-52 w-full">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {pieData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                <span className="h-2 w-2 inline-block shrink-0" style={{ background: PIE_COLORS[i] }} />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background p-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-1">
            Évolution
          </p>
          <p className="text-sm font-bold uppercase tracking-wider mb-4">Revenus — 6 mois</p>
          <ChartContainer config={{ revenus: { label: "Revenus (XOF)", color: "var(--foreground)" } }} className="h-52 w-full">
            <BarChart data={data.monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000   ? `${(v / 1_000).toFixed(0)}k`
                  : String(v)
                }
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => amountFormatXOF(Number(v))} />} />
              <Bar dataKey="revenus" fill="var(--foreground)" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* ── Derniers colis ── */}
      <div className="mt-px border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]">
            Derniers colis
          </p>
          <div className="flex items-center gap-6">
            <a href="/api/export/paiements" className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
              Paiements CSV
            </a>
            <a href="/api/export/colis" className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
              Colis CSV
            </a>
          </div>
        </div>

        {data.recentColis.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-[10px] uppercase tracking-widest">
            Aucun colis
          </p>
        ) : (
          <>
            {/* Cards — mobile only */}
            <div className="flex flex-col divide-y divide-border md:hidden">
              {data.recentColis.map((c) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xs font-bold">{c.code}</span>
                    <StatusBadge statut={c.statut} />
                  </div>
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Expéditeur</p>
                      <p>{c.expediteurEstFournisseur ? <span className="text-muted-foreground">Fournisseur</span> : c.expediteurNom}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Destinataire</p>
                      <p className="text-muted-foreground">{c.destinataireNom}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider">
                      {getDestinationText(c.destination)}
                    </Badge>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <span className="text-muted-foreground">{c.poids} kg</span>
                      <span className="font-bold font-display">{amountFormatXOF(c.prixTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table — md+ only */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground py-3">Code</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground py-3">Expéditeur</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground py-3">Destinataire</TableHead>
                    <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground py-3">Destination</TableHead>
                    <TableHead className="text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground py-3">Poids</TableHead>
                    <TableHead className="text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground py-3">Prix</TableHead>
                    <TableHead className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground py-3">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentColis.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/40 transition-colors border-b border-border/50">
                      <TableCell className="font-display text-xs font-bold py-3.5">{c.code}</TableCell>
                      <TableCell className="text-sm py-3.5">
                        {c.expediteurEstFournisseur ? <span className="text-muted-foreground">Fournisseur</span> : c.expediteurNom}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground py-3.5">{c.destinataireNom}</TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider">
                          {getDestinationText(c.destination)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground py-3.5">{c.poids} kg</TableCell>
                      <TableCell className="text-right font-bold font-display text-sm tabular-nums py-3.5">
                        {amountFormatXOF(c.prixTotal)}
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        <StatusBadge statut={c.statut} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
