"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Wallet, ArrowDownCircle, Download } from "lucide-react";
import { amountFormatXOF } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Roles } from "@/lib/enums";
import { getActiveDestination, type ActiveDestination } from "@/lib/form-settings";

type Destination = "MALI" | "COTE_DIVOIRE";

interface Retrait {
  id: string;
  montant: number;
  motif: string;
  note: string | null;
  createdAt: string;
  agent: { firstname: string; lastname: string };
}

interface CaisseData {
  solde: number;
  totalEncaisse: number;
  totalRetraits: number;
  retraits: Retrait[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

const retraitSchema = z.object({
  montant: z.string().min(1, "Montant requis"),
  motif: z.string().min(3, "Motif requis (min. 3 caractères)"),
  note: z.string().optional(),
});

type RetraitForm = z.infer<typeof retraitSchema>;


const ROLE_DEST: Record<string, Destination> = {
  [Roles.AGENT_MALI]: "MALI",
  [Roles.AGENT_CI]: "COTE_DIVOIRE",
};

export default function CaissePage() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role ?? "";
  const isSuperAdmin = role === Roles.SUPER_ADMIN;
  const canRetrait = isSuperAdmin || role === Roles.AGENT_MALI || role === Roles.AGENT_CI;

  // Destination : fixe pour les agents, depuis le paramètre pays pour l'admin
  const [dest, setDest] = useState<Destination>("MALI");
  const [data, setData] = useState<CaisseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RetraitForm>({
    resolver: zodResolver(retraitSchema),
    defaultValues: { montant: "", motif: "", note: "" },
  });

  useEffect(() => {
    const d = ROLE_DEST[role] ?? getActiveDestination();
    setDest(d);
  }, [role]);

  const fetchData = useCallback(async (p = 1, d: Destination = dest) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/caisse?page=${p}&destination=${d}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [dest]);

  useEffect(() => {
    setPage(1);
    fetchData(1, dest);
  }, [dest]);

  useEffect(() => {
    fetchData(page, dest);
  }, [page]);

  async function onSubmit(values: RetraitForm) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/caisse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          montant: parseFloat(values.montant),
          destination: dest,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erreur lors du retrait");
        return;
      }
      toast.success("Retrait effectué avec succès");
      setDialogOpen(false);
      form.reset();
      setPage(1);
      fetchData(1, dest);
    } finally {
      setSubmitting(false);
    }
  }

  const kpis = [
    { title: "Solde disponible", value: data?.solde,         icon: Wallet },
    { title: "Total encaissé",   value: data?.totalEncaisse, icon: TrendingUp },
    { title: "Total retiré",     value: data?.totalRetraits, icon: TrendingDown },
  ];

  const destLabel = dest === "COTE_DIVOIRE" ? "Côte d'Ivoire" : "Mali";

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-1">Gestion</p>
          <h1 className="text-sm font-bold uppercase tracking-[0.2em]">Caisse</h1>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <a href="/api/export/retraits">
              <Button variant="outline" size="sm">
                <Download size={14} className="mr-2" />
                Export CSV
              </Button>
            </a>
          )}
          {canRetrait && (
            <Button onClick={() => setDialogOpen(true)}>
              <ArrowDownCircle size={14} className="mr-2" />
              Retrait
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="border border-border bg-background p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {kpi.title}
              </p>
              <kpi.icon size={12} className="text-muted-foreground/40 shrink-0 mt-0.5" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-display tabular-nums leading-none break-all">
                {amountFormatXOF(kpi.value ?? 0)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Tableau des retraits */}
      <div className="border border-border">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]">
            Historique des retraits — {destLabel}
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Date</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Motif</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Note</TableHead>
                <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Agent</TableHead>
                <TableHead className="text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.retraits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Aucun retrait enregistré
                  </TableCell>
                </TableRow>
              ) : (
                data?.retraits.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {new Date(r.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{r.motif}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.agent.firstname} {r.agent.lastname}
                    </TableCell>
                    <TableCell className="text-right font-bold font-display tabular-nums">
                      -{amountFormatXOF(r.montant)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {data.pagination.total} retrait{data.pagination.total > 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Précédent
              </Button>
              <span className="text-[10px] font-bold uppercase tracking-wider tabular-nums">
                {page} / {data.pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Retrait */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retrait — Caisse {destLabel}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="py-2 flex flex-col gap-4">
              {data && (
                <div className="bg-muted px-4 py-3 text-sm border border-border">
                  Solde disponible :{" "}
                  <span className="font-bold font-display">
                    {amountFormatXOF(data.solde)}
                  </span>
                </div>
              )}

              <Controller
                name="montant"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Montant (XOF)</FieldLabel>
                    <Input
                      {...field}
                      type="number"
                      min={1}
                      placeholder="Ex : 50000"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="motif"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Motif</FieldLabel>
                    <Input
                      {...field}
                      placeholder="Ex : Salaires, Loyer, Frais opérationnels..."
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="note"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Note (optionnel)</FieldLabel>
                    <Input {...field} placeholder="Détails supplémentaires..." />
                  </Field>
                )}
              />
            </FieldGroup>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2Icon size={14} className="animate-spin mr-2" />
                ) : (
                  <ArrowDownCircle size={14} className="mr-2" />
                )}
                Confirmer le retrait
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
