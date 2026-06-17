"use client";

import { useEffect, useState } from "react";
import { useColis } from "@/hooks/use-colis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/status-badge";
import { Plus, Search, Eye, ExternalLink, Filter, ChevronLeft, ChevronRight, Trash2, ArrowRightLeft, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { amountFormatXOF, getDestinationText } from "@/lib/utils";
import { Roles, StatutColis, isAdmin } from "@/lib/enums";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { getActiveDestination } from "@/lib/form-settings";


const STATUTS = [
  { value: "ALL", label: "Tous les statuts" },
  { value: StatutColis.ENREGISTRE, label: "Enregistré" },
  { value: StatutColis.EN_COURS_ENVOI, label: "En cours d'envoi" },
  { value: StatutColis.EN_TRANSIT, label: "En transit" },
  { value: StatutColis.ARRIVE_AGENCE, label: "Arrivé agence" },
  { value: StatutColis.PRET_RETIRER, label: "Prêt à retirer" },
  { value: StatutColis.LIVRE, label: "Livré" },
  { value: StatutColis.LITIGE, label: "Litige" },
  { value: StatutColis.ANNULE, label: "Annulé" },
];

const STATUTS_TRANSITION = [
  { value: StatutColis.ENREGISTRE,    label: "Enregistré" },
  { value: StatutColis.EN_COURS_ENVOI, label: "En cours d'envoi" },
  { value: StatutColis.EN_TRANSIT,    label: "En transit" },
  { value: StatutColis.ARRIVE_AGENCE, label: "Arrivé agence" },
  { value: StatutColis.PRET_RETIRER,  label: "Prêt à retirer" },
];

const PER_PAGE = 10;

type AppSettings = { agentsCanEditColis: boolean; agentsCanDeleteColis: boolean };
type EditForm = { poids: string; expediteurNom: string; expediteurPhone: string; destinataireNom: string; destinatairePhone: string; destinataireVille: string };

export default function ColisPage() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role ?? "";
  const isSuperAdmin = isAdmin(role);


  const [appSettings, setAppSettings] = useState<AppSettings>({ agentsCanEditColis: false, agentsCanDeleteColis: false });

  const { colis, loading, deleteColis, refetch } = useColis();
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("ALL");

  const [filterExpress, setFilterExpress] = useState(false);
  const [filterDette, setFilterDette] = useState(false);
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit dialog
  const [editCode, setEditCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ poids: "", expediteurNom: "", expediteurPhone: "", destinataireNom: "", destinatairePhone: "", destinataireVille: "" });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetch("/api/parametres").then((r) => r.json()).then(setAppSettings);
  }, []);

  const canEdit = isSuperAdmin || appSettings.agentsCanEditColis;
  const canDelete = isSuperAdmin || appSettings.agentsCanDeleteColis;

  function openEdit(c: typeof colis[0]) {
    setEditCode(c.code);
    setEditForm({
      poids: String(c.poids),
      expediteurNom: c.expediteurNom,
      expediteurPhone: c.expediteurPhone,
      destinataireNom: c.destinataireNom,
      destinatairePhone: c.destinatairePhone,
      destinataireVille: (c as any).destinataireVille ?? "",
    });
  }

  async function saveEdit() {
    if (!editCode) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/colis/${editCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, poids: parseFloat(editForm.poids) }),
      });
      if (!res.ok) { toast.error("Erreur lors de la modification"); return; }
      toast.success("Colis modifié");
      setEditCode(null);
      refetch();
    } finally {
      setEditSaving(false);
    }
  }

  // Bulk statut
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFrom, setBulkFrom] = useState(StatutColis.ENREGISTRE);
  const [bulkTo, setBulkTo] = useState(StatutColis.EN_COURS_ENVOI);
  const [bulkDest, setBulkDest] = useState("ALL");
  const [bulkCount, setBulkCount] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (!bulkOpen) return;
    setBulkCount(null);
    fetch(`/api/colis/bulk-statut?fromStatut=${bulkFrom}&destination=${bulkDest}`)
      .then((r) => r.json())
      .then((d) => setBulkCount(d.count));
  }, [bulkOpen, bulkFrom, bulkDest]);

  async function handleBulkStatut() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/colis/bulk-statut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromStatut: bulkFrom, toStatut: bulkTo, destination: bulkDest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.count} colis mis à jour`, { position: "bottom-right" });
      setBulkOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur", { position: "bottom-right" });
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleDelete(code: string) {
    if (!confirm(`Supprimer le colis ${code} ?`)) return;
    setDeletingId(code);
    await deleteColis(code);
    setDeletingId(null);
  }

  const filtered = colis.filter((c) => {
    if (!c) return false;
    const matchSearch =
      search === "" ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.expediteurNom.toLowerCase().includes(search.toLowerCase()) ||
      c.destinataireNom.toLowerCase().includes(search.toLowerCase()) ||
      c.destinatairePhone.includes(search);
    const matchStatut = filterStatut === "ALL" || c.statut === filterStatut;

    const matchExpress = !filterExpress || (c as any).express === true;
    const matchDette = !filterDette || ((c as any).remisEnDette === true && !c.soldePaye);
    const needsDestFilter = isAdmin(role) || role === Roles.AGENT_CHINE;
    const matchDest = !needsDestFilter || c.destination === getActiveDestination();
    return matchSearch && matchStatut && matchExpress && matchDette && matchDest;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterStatut, filterExpress, filterDette]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-sm font-bold uppercase tracking-[0.2em] shrink-0">Colis</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="hidden sm:flex">
            <ArrowRightLeft className="w-4 h-4 mr-1" />
            Changer statut
          </Button>
          <Button variant="outline" size="icon" onClick={() => setBulkOpen(true)} className="sm:hidden">
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
          <Button asChild>
            <Link href="/colis/ajouter">
              <Plus className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Nouveau colis</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par code, nom, téléphone..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => setFilterExpress((v) => !v)}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
            filterExpress
              ? "bg-orange-500 text-white border-orange-500"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          Express
        </button>
        <button
          type="button"
          onClick={() => setFilterDette((v) => !v)}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
            filterDette
              ? "bg-red-500 text-white border-red-500"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          En dette
        </button>
      </div>

      {/* Cards — mobile only */}
      <div className="flex flex-col gap-px md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border p-4 space-y-3 animate-pulse">
              <div className="h-4 w-24 bg-muted" />
              <div className="h-3 w-48 bg-muted" />
              <div className="h-3 w-32 bg-muted" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="border border-border py-12 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            {search || filterStatut !== "ALL" ? "Aucun résultat" : "Aucun colis enregistré"}
          </div>
        ) : (
          paginated.map((c) => (
            <div key={c.id} className="border border-border p-4 space-y-3">
              {/* Row 1 : code + date + status */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-xs font-bold">{c.code}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                  <StatusBadge statut={c.statut} />
                </div>
              </div>
              {/* Row 2 : expéditeur → destinataire */}
              <div className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Expéditeur</p>
                  <p>{c.expediteurEstFournisseur ? <span className="text-muted-foreground">Fournisseur</span> : c.expediteurNom}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Destinataire</p>
                  <p>{c.destinataireNom}</p>
                  <p className="text-xs text-muted-foreground">{c.destinatairePhone}</p>
                </div>
              </div>
              {/* Row 3 : destination + poids + prix */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider">
                  {getDestinationText(c.destination)}
                </Badge>
                <div className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="text-muted-foreground">{c.poids} kg</span>
                  <span className="font-bold font-display">{amountFormatXOF(c.prixTotal)}</span>
                </div>
              </div>
              {/* Row 4 : paiement + actions */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                  <span className={c.avancePaye ? "" : "text-muted-foreground"}>Avance {c.avancePaye ? "✓" : "✗"}</span>
                  {(c as any).remisEnDette && !c.soldePaye ? (
                    <span className="text-red-500">Dette</span>
                  ) : (
                    <span className={c.soldePaye ? "" : "text-muted-foreground"}>Solde {c.soldePaye ? "✓" : "✗"}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/colis/${c.code}`}><Eye className="w-4 h-4" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="Lien public de suivi">
                    <a href={`${process.env.NEXT_PUBLIC_APP_URL}/suivi/${c.tokenPublic}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.code)} disabled={deletingId === c.code}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table — md+ only */}
      <div className="hidden md:block border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Code</TableHead>
              <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Expéditeur</TableHead>
              <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Destinataire</TableHead>
              <TableHead className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Destination</TableHead>
              <TableHead className="text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Poids</TableHead>
              <TableHead className="text-right text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Prix</TableHead>
              <TableHead className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Paiement</TableHead>
              <TableHead className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Statut</TableHead>
              <TableHead className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: PER_PAGE }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-12 text-[10px] uppercase tracking-widest">
                  {search || filterStatut !== "ALL" ? "Aucun résultat" : "Aucun colis enregistré"}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-display text-xs font-bold whitespace-nowrap">{c.code}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {c.expediteurEstFournisseur
                      ? <span className="text-muted-foreground">Fournisseur</span>
                      : c.expediteurNom}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm">{c.destinataireNom}</div>
                    <div className="text-xs text-muted-foreground">{c.destinatairePhone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap text-[9px] font-bold uppercase tracking-wider">
                      {getDestinationText(c.destination)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">{c.poids} kg</TableCell>
                  <TableCell className="text-right font-bold font-display text-sm tabular-nums whitespace-nowrap">
                    {amountFormatXOF(c.prixTotal)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-0.5 items-center text-[10px] font-bold uppercase tracking-wider">
                      <span className={c.avancePaye ? "" : "text-muted-foreground"}>
                        Avance {c.avancePaye ? "✓" : "✗"}
                      </span>
                      {(c as any).remisEnDette && !c.soldePaye ? (
                        <span className="text-red-500">Dette</span>
                      ) : (
                        <span className={c.soldePaye ? "" : "text-muted-foreground"}>
                          Solde {c.soldePaye ? "✓" : "✗"}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge statut={c.statut} />
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/colis/${c.code}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Lien public de suivi">
                        <a href={`${process.env.NEXT_PUBLIC_APP_URL}/suivi/${c.tokenPublic}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.code)} disabled={deletingId === c.code}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer : count + pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {filtered.length} colis{filtered.length !== colis.length ? ` sur ${colis.length}` : ""}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-[10px] font-bold uppercase tracking-wider tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Dialog — changement de statut groupé */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Changement de statut groupé
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Colis non-express uniquement
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1.5">Destination</p>
                <Select value={bulkDest} onValueChange={setBulkDest}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes destinations</SelectItem>
                    <SelectItem value="MALI">Mali</SelectItem>
                    <SelectItem value="COTE_DIVOIRE">Côte d&apos;Ivoire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div>
                  <p className="text-xs font-medium mb-1.5">Statut actuel</p>
                  <Select value={bulkFrom} onValueChange={(v) => setBulkFrom(v as StatutColis)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS_TRANSITION.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ArrowRightLeft className="w-4 h-4 text-muted-foreground mt-5" />
                <div>
                  <p className="text-xs font-medium mb-1.5">Nouveau statut</p>
                  <Select value={bulkTo} onValueChange={(v) => setBulkTo(v as StatutColis)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS_TRANSITION.filter((s) => s.value !== bulkFrom).map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 border border-border px-4 py-3 text-sm">
              {bulkCount === null ? (
                <span className="text-muted-foreground">Calcul en cours…</span>
              ) : (
                <span>
                  <span className="font-bold text-foreground">{bulkCount}</span>
                  {" "}colis concerné{bulkCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleBulkStatut}
              disabled={bulkLoading || bulkCount === 0 || bulkCount === null || bulkFrom === bulkTo}
            >
              {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog — édition colis */}
      <Dialog open={!!editCode} onOpenChange={(o) => { if (!o) setEditCode(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Modifier le colis {editCode}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Expéditeur</FieldLabel>
                <Input value={editForm.expediteurNom} onChange={(e) => setEditForm((f) => ({ ...f, expediteurNom: e.target.value }))} placeholder="Nom expéditeur" />
              </Field>
              <Field>
                <FieldLabel>Tél. expéditeur</FieldLabel>
                <Input value={editForm.expediteurPhone} onChange={(e) => setEditForm((f) => ({ ...f, expediteurPhone: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Destinataire</FieldLabel>
                <Input value={editForm.destinataireNom} onChange={(e) => setEditForm((f) => ({ ...f, destinataireNom: e.target.value }))} placeholder="Nom destinataire" />
              </Field>
              <Field>
                <FieldLabel>Tél. destinataire</FieldLabel>
                <Input value={editForm.destinatairePhone} onChange={(e) => setEditForm((f) => ({ ...f, destinatairePhone: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Ville</FieldLabel>
                <Input value={editForm.destinataireVille} onChange={(e) => setEditForm((f) => ({ ...f, destinataireVille: e.target.value }))} placeholder="Ville" />
              </Field>
              <Field>
                <FieldLabel>Poids (kg)</FieldLabel>
                <Input type="number" min={0} step={0.1} value={editForm.poids} onChange={(e) => setEditForm((f) => ({ ...f, poids: e.target.value }))} />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCode(null)}>Annuler</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Pencil className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
