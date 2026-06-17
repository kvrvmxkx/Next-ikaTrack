import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { isMaintenanceMode } from "@/lib/settings";
import {
  getStatutText,
  getRelativeTimeWithPrefix,
  amountFormatXOF,
  getDestinationText,
} from "@/lib/utils";
import { StatutColis } from "@/lib/enums";
import { Package, MapPin, Phone, User, Clock, CheckCircle, CreditCard } from "lucide-react";

const ETAPES_ORDRE = [
  StatutColis.ENREGISTRE,
  StatutColis.EN_COURS_ENVOI,
  StatutColis.EN_TRANSIT,
  StatutColis.ARRIVE_AGENCE,
  StatutColis.PRET_RETIRER,
  StatutColis.LIVRE,
];

export default async function SuiviPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (await isMaintenanceMode()) redirect("/maintenance");

  const colis = await prisma.colis.findUnique({
    where: { tokenPublic: token },
    include: { historique: { orderBy: { createdAt: "desc" } } },
  });

  if (!colis) return notFound();

  const etapeActuelle = ETAPES_ORDRE.indexOf(colis.statut as StatutColis);
  const estTerminal   = colis.statut === StatutColis.LITIGE || colis.statut === StatutColis.ANNULE;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-xl mx-auto space-y-0">

        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-0.5">
              Package Tracker
            </p>
            <p className="text-[10px] text-muted-foreground">Chine → Mali & Côte d&apos;Ivoire</p>
          </div>
          <Package className="w-5 h-5 text-muted-foreground/30" />
        </div>

        {/* Code & statut */}
        <div className="py-8 border-b border-border">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Code de suivi
          </p>
          <div className="flex items-start justify-between gap-4">
            <p className="text-4xl font-bold font-display tabular-nums leading-none">{colis.code}</p>
            <p className="text-sm font-bold uppercase tracking-wider mt-1">{getStatutText(colis.statut)}</p>
          </div>
          {colis.description && (
            <p className="text-sm text-muted-foreground mt-3">{colis.description}</p>
          )}
        </div>

        {/* Infos */}
        <div className="py-6 border-b border-border grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-1.5">
              <User className="w-3 h-3" /> Expéditeur
            </p>
            <p className="font-medium">{colis.expediteurNom}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-1.5">
              <User className="w-3 h-3" /> Destinataire
            </p>
            <p className="font-medium">{colis.destinataireNom}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> Téléphone
            </p>
            <p className="font-medium">{colis.destinatairePhone}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Destination
            </p>
            <p className="font-medium">
              {getDestinationText(colis.destination)}
              {colis.destinataireVille && ` — ${colis.destinataireVille}`}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-1.5">
              <Package className="w-3 h-3" /> Poids
            </p>
            <p className="font-bold font-display">{colis.poids} kg</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Enregistré
            </p>
            <p className="text-sm">{new Date(colis.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {/* Paiement */}
        {colis.prixTotal > 0 && (
          <div className="py-6 border-b border-border">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4 flex items-center gap-1.5">
              <CreditCard className="w-3 h-3" /> Paiement
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Montant total</span>
                <span className="font-bold font-display">{amountFormatXOF(colis.prixTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avance payée</span>
                <span className="font-display">{amountFormatXOF(colis.avance)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-medium">Solde à la livraison</span>
                {colis.soldePaye ? (
                  <span className="font-bold font-display flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Soldé
                  </span>
                ) : (
                  <span className="font-bold font-display">{amountFormatXOF(colis.solde)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progression */}
        {!estTerminal && (
          <div className="py-6 border-b border-border">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">
              Progression
            </p>
            <div className="space-y-0">
              {ETAPES_ORDRE.map((etape, index) => {
                const estPassee   = index <= etapeActuelle;
                const estCourante = index === etapeActuelle;
                return (
                  <div key={etape} className="flex items-center gap-4 py-2.5 border-b border-border/40 last:border-0">
                    <div className={`w-5 h-5 flex items-center justify-center shrink-0 border ${
                      estPassee ? "bg-foreground border-foreground text-background" : "border-border text-muted-foreground"
                    }`}>
                      {estPassee ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <span className="text-[9px] font-bold">{index + 1}</span>
                      )}
                    </div>
                    <p className={`text-sm ${estCourante ? "font-bold" : estPassee ? "text-foreground" : "text-muted-foreground"}`}>
                      {getStatutText(etape)}
                    </p>
                    {estCourante && (
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-wider border border-foreground px-2 py-0.5">
                        En cours
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Statuts terminaux */}
        {colis.statut === StatutColis.LITIGE && (
          <div className="py-6 border-b border-border border-l-4 border-l-foreground pl-4">
            <p className="font-bold uppercase tracking-wider text-sm">
              Litige signalé — Contactez votre agence.
            </p>
          </div>
        )}
        {colis.statut === StatutColis.ANNULE && (
          <div className="py-6 border-b border-border border-l-4 border-l-destructive pl-4">
            <p className="font-bold uppercase tracking-wider text-sm text-destructive">
              Ce colis a été annulé.
            </p>
          </div>
        )}

        {/* Historique */}
        {colis.historique.length > 0 && (
          <div className="py-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-4">
              Historique
            </p>
            <div className="space-y-0">
              {colis.historique.map((h, i) => (
                <div key={h.id} className="flex gap-4 py-3 border-b border-border/40 last:border-0 text-sm">
                  <div className="w-2 h-2 bg-foreground shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <p className="font-medium">{getStatutText(h.statut)}</p>
                    {h.note && <p className="text-muted-foreground text-xs mt-0.5">{h.note}</p>}
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {getRelativeTimeWithPrefix(new Date(h.createdAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[9px] uppercase tracking-[0.2em] text-muted-foreground/40 py-6">
          Package Tracker — Chine → Mali & Côte d&apos;Ivoire
        </p>

      </div>
    </div>
  );
}
