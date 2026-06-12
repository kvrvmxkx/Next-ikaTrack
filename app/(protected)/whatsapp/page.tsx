"use client";

import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MessageCircle, CheckCheck, Check, Clock, XCircle, Search, ChevronLeft, ChevronRight, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";

type Log = {
  id: string;
  event: string;
  messageId: string | null;
  phone: string;
  status: string | null;
  message: string | null;
  createdAt: string;
};

type Stats = {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type ApiResponse = {
  stats: Stats;
  pagination: Pagination;
  logs: Log[];
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "outline" | "destructive"; icon: React.ReactNode }> = {
  sent:      { label: "Envoyé",   variant: "outline",     icon: <Check size={10} /> },
  delivered: { label: "Livré",    variant: "default",     icon: <CheckCheck size={10} /> },
  read:      { label: "Lu",       variant: "default",     icon: <CheckCheck size={10} className="text-blue-500" /> },
  failed:    { label: "Échoué",   variant: "destructive", icon: <XCircle size={10} /> },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <Badge variant="outline" className="text-[9px]">{status}</Badge>;
  return (
    <Badge variant={cfg.variant} className="text-[9px] gap-1">
      {cfg.icon}{cfg.label}
    </Badge>
  );
}

function StatCard({ label, value, icon, loading }: { label: string; value: number; icon: React.ReactNode; loading: boolean }) {
  return (
    <div className="bg-background p-5 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[9px] font-bold uppercase tracking-[0.22em]">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <p className="text-3xl font-bold font-display tabular-nums">{value.toLocaleString("fr-FR")}</p>
      )}
    </div>
  );
}

export default function WhatsappPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const webhookUrl = `${appUrl}/api/whatsapp/webhook`;

  const fetchData = useCallback(async (p: number, phone: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (phone) params.set("phone", phone);
      const res = await fetch(`/api/whatsapp/admin?${params}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, phoneQuery);
  }, [page, phoneQuery, fetchData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setPhoneQuery(phoneFilter);
  }

  const stats = data?.stats ?? { sent: 0, delivered: 0, read: 0, failed: 0 };
  const pagination = data?.pagination;
  const logs = data?.logs ?? [];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-1">Wasender</p>
          <h1 className="text-sm font-bold uppercase tracking-[0.2em]">Logs WhatsApp</h1>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="mt-px border border-border">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Webhook size={14} className="text-muted-foreground" />
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]">Webhook</p>
        </div>
        <div className="p-5">
          <div className="bg-muted border border-border px-4 py-3 flex items-center justify-between gap-4">
            <p className="font-mono text-xs break-all">{webhookUrl}</p>
            <button
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Copier
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            À configurer dans le dashboard Wasender → Settings → Webhook URL
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-px border border-border">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <MessageCircle size={14} className="text-muted-foreground" />
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]">Statistiques</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
          <StatCard label="Envoyés"  value={stats.sent}      icon={<Check size={12} />}     loading={loading} />
          <StatCard label="Livrés"   value={stats.delivered} icon={<CheckCheck size={12} />} loading={loading} />
          <StatCard label="Lus"      value={stats.read}      icon={<Clock size={12} />}      loading={loading} />
          <StatCard label="Échoués"  value={stats.failed}    icon={<XCircle size={12} />}    loading={loading} />
        </div>
      </div>

      {/* Logs */}
      <div className="mt-px border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-4">
          <div className="flex items-center gap-2">
            <MessageCircle size={14} className="text-muted-foreground" />
            <p className="text-[9px] font-bold uppercase tracking-[0.22em]">Historique</p>
            {pagination && (
              <span className="text-[9px] text-muted-foreground">
                ({pagination.total.toLocaleString("fr-FR")} entrée{pagination.total > 1 ? "s" : ""})
              </span>
            )}
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                placeholder="Filtrer par numéro…"
                className="pl-8 h-8 text-xs w-48"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
              Chercher
            </Button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Date</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Téléphone</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Événement</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Statut</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12 text-[10px] uppercase tracking-widest">
                    Aucun log
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.phone}</TableCell>
                    <TableCell>
                      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                        {log.event}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={log.status} /></TableCell>
                    <TableCell className="max-w-xs">
                      {log.message ? (
                        <span className="text-xs text-muted-foreground truncate block max-w-xs" title={log.message}>
                          {log.message}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              Page {pagination.page} / {pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= pagination.pages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}