import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/enums";
import { getStatutText, getDestinationText } from "@/lib/utils";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !isAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const colis = await prisma.colis.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { name: true } },
    },
  });

  const header = [
    "Code", "Expéditeur", "Destinataire", "Tél. Destinataire",
    "Destination", "Ville Destinataire", "Poids (kg)",
    "Prix Total (XOF)", "Avance (XOF)", "Solde (XOF)",
    "Avance Payée", "Solde Payé", "Statut", "Agent", "Date Création",
  ].join(";");

  const rows = colis.map((c) => [
    c.code,
    `"${c.expediteurNom.replace(/"/g, '""')}"`,
    `"${c.destinataireNom.replace(/"/g, '""')}"`,
    c.destinatairePhone,
    getDestinationText(c.destination),
    c.destinataireVille ?? "",
    c.poids.toString().replace(".", ","),
    c.prixTotal,
    c.avance,
    c.solde,
    c.avancePaye ? "Oui" : "Non",
    c.soldePaye ? "Oui" : "Non",
    getStatutText(c.statut),
    c.agent?.name ?? "",
    new Date(c.createdAt).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }),
  ].join(";"));

  const csv = [header, ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="colis-${date}.csv"`,
    },
  });
}
