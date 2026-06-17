import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { StatutColis, isAdmin } from "@/lib/enums";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !isAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dest = searchParams.get("destination") as "MALI" | "COTE_DIVOIRE" | null;
  const colisWhere = dest ? { destination: dest } : {};

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      totalColis,
      enregistre,
      enTransit,
      livre,
      annule,
      litige,
      revenusData,
      paiementsData,
      agentsCount,
      colisAujourdhui,
      recentColis,
      colisParMois,
      dette,
    ] = await Promise.all([
      prisma.colis.count({ where: colisWhere }),
      prisma.colis.count({ where: { ...colisWhere, statut: StatutColis.ENREGISTRE } }),
      prisma.colis.count({ where: { ...colisWhere, statut: { in: [StatutColis.EN_COURS_ENVOI, StatutColis.EN_TRANSIT] } } }),
      prisma.colis.count({ where: { ...colisWhere, statut: StatutColis.LIVRE } }),
      prisma.colis.count({ where: { ...colisWhere, statut: StatutColis.ANNULE } }),
      prisma.colis.count({ where: { ...colisWhere, statut: StatutColis.LITIGE } }),
      prisma.colis.aggregate({ _sum: { prixTotal: true }, where: colisWhere }),
      prisma.paiement.aggregate({
        _sum: { montant: true },
        where: dest ? { colis: { destination: dest } } : {},
      }),
      prisma.user.count({ where: { active: true } }),
      prisma.colis.findMany({
        where: { ...colisWhere, createdAt: { gte: startOfDay } },
        select: { poids: true },
      }),
      prisma.colis.findMany({
        where: colisWhere,
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, code: true, expediteurEstFournisseur: true, expediteurNom: true, destinataireNom: true,
          destination: true, poids: true, prixTotal: true, statut: true, createdAt: true,
        },
      }),
      prisma.colis.findMany({
        where: { ...colisWhere, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, prixTotal: true },
      }),
      prisma.colis.aggregate({
        where: { ...colisWhere, remisEnDette: true, soldePaye: false },
        _sum: { solde: true },
        _count: true,
      }),
    ]);

    const monthlyMap: Record<string, { count: number; revenus: number }> = {};
    for (const c of colisParMois) {
      const key = new Date(c.createdAt).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      if (!monthlyMap[key]) monthlyMap[key] = { count: 0, revenus: 0 };
      monthlyMap[key].count++;
      monthlyMap[key].revenus += c.prixTotal;
    }
    const monthlyData = Object.entries(monthlyMap)
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6);

    const totalPoids = colisAujourdhui.reduce((sum, c) => sum + c.poids, 0);

    return NextResponse.json({
      colis: {
        total: totalColis,
        enregistre,
        enTransit,
        livre,
        annule,
        litige,
        revenusAttendus:  revenusData._sum.prixTotal  ?? 0,
        revenusEncaisses: paiementsData._sum.montant  ?? 0,
        totalDetteActive: dette._sum.solde            ?? 0,
        nbColisEnDette:   dette._count,
      },
      agents: { total: agentsCount },
      aujourd_hui: { count: colisAujourdhui.length, poids: Math.round(totalPoids * 10) / 10 },
      recentColis,
      monthlyData,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
