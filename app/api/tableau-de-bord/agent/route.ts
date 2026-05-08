import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Roles, StatutColis } from "@/lib/enums";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const role = (session.user as any).role;
  if (role === Roles.SUPER_ADMIN) {
    return NextResponse.json({ error: "Use /api/tableau-de-bord" }, { status: 400 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    if (role === Roles.AGENT_CHINE) {
      // Agent Chine — vue expédition
      const [enregistres, enCoursEnvoi, enTransit, totalMois, paiementsJour, recentColis] =
        await Promise.all([
          prisma.colis.count({ where: { statut: StatutColis.ENREGISTRE } }),
          prisma.colis.count({ where: { statut: StatutColis.EN_COURS_ENVOI } }),
          prisma.colis.count({ where: { statut: StatutColis.EN_TRANSIT } }),
          prisma.colis.count({
            where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
          }),
          prisma.paiement.aggregate({
            where: { type: "AVANCE", createdAt: { gte: startOfDay } },
            _sum: { montant: true },
          }),
          prisma.colis.findMany({
            take: 8,
            orderBy: { createdAt: "desc" },
            where: { agentId: session.user.id },
            select: {
              id: true, code: true, expediteurEstFournisseur: true, expediteurNom: true,
              destinataireNom: true, destination: true,
              poids: true, prixTotal: true, statut: true, createdAt: true,
            },
          }),
        ]);

      return NextResponse.json({
        role,
        chine: {
          enregistres,
          enCoursEnvoi,
          enTransit,
          totalMois,
          avancesJour: paiementsJour._sum.montant ?? 0,
        },
        recentColis,
      });
    }

    // Agent Mali ou CI — vue réception
    const destination = role === Roles.AGENT_MALI ? "MALI" : "COTE_DIVOIRE";

    const [arriveAgence, pretRetirer, litigues, soldesEnAttente, paiementsJour, dette, recentColis] =
      await Promise.all([
        prisma.colis.count({ where: { statut: StatutColis.ARRIVE_AGENCE, destination } }),
        prisma.colis.count({ where: { statut: StatutColis.PRET_RETIRER, destination } }),
        prisma.colis.count({ where: { statut: StatutColis.LITIGE, destination } }),
        prisma.colis.aggregate({
          where: { soldePaye: false, destination, statut: { in: [StatutColis.ARRIVE_AGENCE, StatutColis.PRET_RETIRER] } },
          _sum: { solde: true },
          _count: true,
        }),
        prisma.paiement.aggregate({
          where: { type: "SOLDE", createdAt: { gte: startOfDay }, colis: { destination } },
          _sum: { montant: true },
        }),
        prisma.colis.aggregate({
          where: { remisEnDette: true, soldePaye: false, destination },
          _sum: { solde: true },
          _count: true,
        }),
        prisma.colis.findMany({
          take: 8,
          orderBy: { updatedAt: "desc" },
          where: { destination },
          select: {
            id: true, code: true, expediteurNom: true,
            destinataireNom: true, destination: true,
            poids: true, prixTotal: true, solde: true, soldePaye: true,
            remisEnDette: true, statut: true, createdAt: true,
          },
        }),
      ]);

    return NextResponse.json({
      role,
      destination: {
        arriveAgence,
        pretRetirer,
        litigues,
        soldesEnAttente:         soldesEnAttente._sum.solde ?? 0,
        nbColisAttentesPaiement: soldesEnAttente._count,
        soldesJour:              paiementsJour._sum.montant ?? 0,
        totalDetteActive:        dette._sum.solde ?? 0,
        nbColisEnDette:          dette._count,
      },
      recentColis,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
