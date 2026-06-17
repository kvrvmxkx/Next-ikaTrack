import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/enums";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !isAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const paiements = await prisma.paiement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      colis: { select: { code: true, destination: true } },
      agent: { select: { name: true } },
    },
  });

  const header = [
    "Code Colis", "Destination", "Type", "Montant (XOF)", "Agent", "Note", "Date",
  ].join(";");

  const rows = paiements.map((p) => [
    p.colis.code,
    p.colis.destination,
    p.type,
    p.montant,
    p.agent?.name ?? "",
    p.note ? `"${p.note.replace(/"/g, '""')}"` : "",
    new Date(p.createdAt).toLocaleDateString("fr-FR", {
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
      "Content-Disposition": `attachment; filename="paiements-${date}.csv"`,
    },
  });
}
