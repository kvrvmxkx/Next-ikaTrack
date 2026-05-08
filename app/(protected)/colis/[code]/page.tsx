"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Package,
  Clock,
  CreditCard,
  CheckCircle,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  amountFormatXOF,
  getDestinationText,
  getRelativeTimeWithPrefix,
  getStatutText,
} from "@/lib/utils";
import { Roles, StatutColis, TypePaiement } from "@/lib/enums";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import type { ColisWithRelations } from "@/lib/types";

const STATUTS_OPTIONS = [
  { value: StatutColis.ENREGISTRE, label: "Enregistré" },
  { value: StatutColis.EN_COURS_ENVOI, label: "En cours d'envoi" },
  { value: StatutColis.EN_TRANSIT, label: "En transit" },
  { value: StatutColis.ARRIVE_AGENCE, label: "Arrivé agence" },
  { value: StatutColis.PRET_RETIRER, label: "Prêt à retirer" },
  { value: StatutColis.LIVRE, label: "Livré" },
  { value: StatutColis.LITIGE, label: "Litige" },
  { value: StatutColis.ANNULE, label: "Annulé" },
];

export default function ColisDetailPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role ?? "";
  const isSuperAdmin = role === Roles.SUPER_ADMIN;

  const [appSettings, setAppSettings] = useState<{ agentsCanEditColis: boolean; agentsCanDeleteColis: boolean }>({ agentsCanEditColis: false, agentsCanDeleteColis: false });
  const [colis, setColis] = useState<ColisWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatut, setUpdatingStatut] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    description: "", poids: "", expediteurNom: "", expediteurPhone: "",
    destinataireNom: "", destinatairePhone: "", destinataireVille: "", destinataireAdresse: "", notes: "",
  });

  // Delete
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Paiement dialog
  const [paiementOpen, setPaiementOpen] = useState(false);
  const [paiementType, setPaiementType] = useState<"AVANCE" | "SOLDE">("AVANCE");
  const [paiementMontant, setPaiementMontant] = useState("");
  const [paiementNote, setPaiementNote] = useState("");
  const [paiementLoading, setPaiementLoading] = useState(false);

  // Statut note dialog
  const [statutNote, setStatutNote] = useState("");

  // Confirmation remise en dette
  const [confirmDetteOpen, setConfirmDetteOpen] = useState(false);
  const [pendingStatut, setPendingStatut] = useState<string | null>(null);

  const fetchColis = async () => {
    setLoading(true);
    const res = await fetch(`/api/colis/${code}`);
    if (!res.ok) return router.push("/colis");
    const data = await res.json();
    setColis(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchColis();
    fetch("/api/parametres").then((r) => r.json()).then(setAppSettings);
  }, [code]);

  const canEdit = isSuperAdmin || appSettings.agentsCanEditColis;
  const canDelete = isSuperAdmin || appSettings.agentsCanDeleteColis;

  function openEdit() {
    if (!colis) return;
    setEditForm({
      description: colis.description ?? "",
      poids: String(colis.poids),
      expediteurNom: colis.expediteurNom,
      expediteurPhone: colis.expediteurPhone,
      destinataireNom: colis.destinataireNom,
      destinatairePhone: colis.destinatairePhone,
      destinataireVille: colis.destinataireVille ?? "",
      destinataireAdresse: colis.destinataireAdresse ?? "",
      notes: colis.notes ?? "",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    setEditLoading(true);
    const res = await fetch(`/api/colis/${code}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      toast.success("Colis mis à jour", { position: "bottom-right" });
      setEditOpen(false);
      fetchColis();
    } else {
      toast.error("Erreur lors de la mise à jour", { position: "bottom-right" });
    }
    setEditLoading(false);
  }

  async function deleteColis() {
    if (!confirm(`Supprimer définitivement le colis ${code} ?`)) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/colis/${code}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Colis supprimé", { position: "bottom-right" });
      router.push("/colis");
    } else {
      toast.error("Erreur lors de la suppression", { position: "bottom-right" });
      setDeleteLoading(false);
    }
  }

  async function updateStatut(newStatut: string) {
    setUpdatingStatut(true);
    const res = await fetch(`/api/colis/${code}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: newStatut, note: statutNote }),
    });
    if (res.ok) {
      toast.success("Statut mis à jour", { position: "bottom-right" });
      fetchColis();
    } else {
      toast.error("Erreur lors de la mise à jour", { position: "bottom-right" });
    }
    setUpdatingStatut(false);
  }

  function handleStatutChange(newStatut: string) {
    if (newStatut === StatutColis.LIVRE && colis && !colis.soldePaye) {
      setPendingStatut(newStatut);
      setConfirmDetteOpen(true);
    } else {
      updateStatut(newStatut);
    }
  }

  async function enregistrerPaiement() {
    if (!paiementMontant) return;
    setPaiementLoading(true);
    const res = await fetch(`/api/colis/${code}/paiement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: paiementType,
        montant: parseFloat(paiementMontant),
        note: paiementNote,
      }),
    });
    if (res.ok) {
      toast.success("Paiement enregistré", { position: "bottom-right" });
      setPaiementOpen(false);
      setPaiementMontant("");
      setPaiementNote("");
      fetchColis();
    } else {
      toast.error("Erreur lors de l'enregistrement", { position: "bottom-right" });
    }
    setPaiementLoading(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers", { position: "bottom-right" });
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-5 bg-muted animate-pulse w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!colis) return null;

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/suivi/${colis.tokenPublic}`;
  const soldeRestant = colis.prixTotal - colis.avance;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/colis">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-bold font-display">{colis.code}</h1>
            <p className="text-xs text-muted-foreground">
              Enregistré {getRelativeTimeWithPrefix(new Date(colis.createdAt))}
              {" · "}par {colis.agent.firstname} {colis.agent.lastname}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge statut={colis.statut} />
          {canEdit && (
            <Button variant="outline" size="icon" onClick={openEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" size="icon" onClick={deleteColis} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
            </Button>
          )}
        </div>
      </div>

      {/* Lien public */}
      <div className="bg-muted/50 border border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">Lien de suivi public</p>
          <p className="text-sm font-mono truncate">{publicUrl}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(publicUrl)}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Infos colis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" /> Détails
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destination</span>
              <Badge variant="outline">{getDestinationText(colis.destination)}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Poids</span>
              <span className="font-medium">{colis.poids} kg</span>
            </div>
            {colis.description && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Description</span>
                <span className="text-right">{colis.description}</span>
              </div>
            )}
            <hr className="my-2" />
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Expéditeur</span>
              <div className="text-right">
                <p>{colis.expediteurNom}</p>
                <p className="text-xs text-muted-foreground">{colis.expediteurPhone}</p>
              </div>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Destinataire</span>
              <div className="text-right">
                <p>{colis.destinataireNom}</p>
                <p className="text-xs text-muted-foreground">{colis.destinatairePhone}</p>
                {colis.destinataireVille && (
                  <p className="text-xs text-muted-foreground">{colis.destinataireVille}</p>
                )}
                {colis.destinataireAdresse && (
                  <p className="text-xs text-muted-foreground">{colis.destinataireAdresse}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finances */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between font-medium text-base">
              <span>Prix total</span>
              <span>{amountFormatXOF(colis.prixTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>
                Avance{" "}
                {colis.avancePaye && <CheckCircle className="w-3 h-3 inline ml-1 text-green-600" />}
              </span>
              <span className="font-medium">{amountFormatXOF(colis.avance)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Solde restant</span>
              <span className={
                colis.soldePaye
                  ? "text-green-600"
                  : (colis as any).remisEnDette
                  ? "text-red-500"
                  : "text-yellow-500"
              }>
                {amountFormatXOF(colis.solde)}
                {colis.soldePaye && <CheckCircle className="w-3 h-3 inline ml-1" />}
              </span>
            </div>
            {(colis as any).remisEnDette && !colis.soldePaye && (
              <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                Ce colis a été livré avec un solde impayé — montant en dette
              </div>
            )}

            {/* Paiements historique */}
            {colis.paiements.length > 0 && (
              <div className="mt-3 space-y-1 border-t pt-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Historique paiements
                </p>
                {colis.paiements.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs">
                    <span>
                      {p.type === "AVANCE" ? "Avance" : "Solde"} —{" "}
                      {p.agent.firstname}
                    </span>
                    <span className="font-medium">{amountFormatXOF(p.montant)}</span>
                  </div>
                ))}
              </div>
            )}

            {(!colis.avancePaye || !colis.soldePaye) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  setPaiementType(!colis.avancePaye ? "AVANCE" : "SOLDE");
                  setPaiementMontant(
                    !colis.avancePaye
                      ? String(colis.avance)
                      : String(colis.solde)
                  );
                  setPaiementOpen(true);
                }}
              >
                <CreditCard className="w-3 h-3 mr-2" />
                Enregistrer un paiement
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mise à jour statut */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Mettre à jour le statut
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Select
              defaultValue={colis.statut}
              onValueChange={handleStatutChange}
              disabled={updatingStatut}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updatingStatut && <Loader2 className="w-5 h-5 animate-spin mt-2" />}
          </div>
          <Textarea
            placeholder="Note optionnelle (visible dans l'historique public)"
            value={statutNote}
            onChange={(e) => setStatutNote(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Historique */}
      {colis.historique.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" /> Historique
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {colis.historique.map((h) => (
                <div key={h.id} className="flex gap-3 text-sm">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 w-px bg-border mt-1" />
                  </div>
                  <div className="pb-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{getStatutText(h.statut)}</p>
                      <span className="text-xs text-muted-foreground">
                        {h.agent.firstname} {h.agent.lastname}
                      </span>
                    </div>
                    {h.note && (
                      <p className="text-muted-foreground text-xs mt-0.5">{h.note}</p>
                    )}
                    <p className="text-muted-foreground text-xs mt-1">
                      {getRelativeTimeWithPrefix(new Date(h.createdAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {colis.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes internes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{colis.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le colis {colis.code}</DialogTitle>
          </DialogHeader>
          <FieldGroup className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Poids (kg)</FieldLabel>
                <Input type="number" step="0.1" value={editForm.poids}
                  onChange={(e) => setEditForm((f) => ({ ...f, poids: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Input value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Expéditeur</FieldLabel>
                <Input value={editForm.expediteurNom}
                  onChange={(e) => setEditForm((f) => ({ ...f, expediteurNom: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Tél. expéditeur</FieldLabel>
                <Input value={editForm.expediteurPhone}
                  onChange={(e) => setEditForm((f) => ({ ...f, expediteurPhone: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Destinataire</FieldLabel>
                <Input value={editForm.destinataireNom}
                  onChange={(e) => setEditForm((f) => ({ ...f, destinataireNom: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Tél. destinataire</FieldLabel>
                <Input value={editForm.destinatairePhone}
                  onChange={(e) => setEditForm((f) => ({ ...f, destinatairePhone: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Ville destinataire</FieldLabel>
                <Input value={editForm.destinataireVille}
                  onChange={(e) => setEditForm((f) => ({ ...f, destinataireVille: e.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Adresse destinataire</FieldLabel>
                <Input value={editForm.destinataireAdresse}
                  onChange={(e) => setEditForm((f) => ({ ...f, destinataireAdresse: e.target.value }))} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Notes internes</FieldLabel>
              <Input value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button onClick={saveEdit} disabled={editLoading}>
                {editLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation remise en dette */}
      <Dialog open={confirmDetteOpen} onOpenChange={setConfirmDetteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer la remise en dette</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ce colis a un solde impayé de{" "}
            <span className="font-bold text-foreground">{amountFormatXOF(colis?.solde ?? 0)}</span>.
            En confirmant, le colis sera marqué comme livré et ce montant passera en dette.
          </p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setConfirmDetteOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDetteOpen(false);
                if (pendingStatut) updateStatut(pendingStatut);
              }}
            >
              Confirmer la remise en dette
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paiement Dialog */}
      <Dialog open={paiementOpen} onOpenChange={setPaiementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={paiementType}
                onValueChange={(v) => setPaiementType(v as "AVANCE" | "SOLDE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVANCE">Avance</SelectItem>
                  <SelectItem value="SOLDE">Solde</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Montant (XOF)</FieldLabel>
              <Input
                type="number"
                value={paiementMontant}
                onChange={(e) => setPaiementMontant(e.target.value)}
                placeholder="Montant perçu"
              />
            </Field>
            <Field>
              <FieldLabel>Note</FieldLabel>
              <Input
                value={paiementNote}
                onChange={(e) => setPaiementNote(e.target.value)}
                placeholder="Optionnelle"
              />
            </Field>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setPaiementOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={enregistrerPaiement}
                disabled={paiementLoading || !paiementMontant}
              >
                {paiementLoading && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                Confirmer
              </Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>
    </div>
  );
}
