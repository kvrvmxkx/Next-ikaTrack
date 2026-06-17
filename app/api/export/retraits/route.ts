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

  const retraits = await prisma.retrait.findMany({
    orderBy: { createdAt: "desc" },
    include: { agent: { select: { firstname: true, lastname: true } } },
  });

  const header = ["Montant (XOF)", "Motif", "Note", "Agent", "Date"].join(";");
  const rows = retraits.map((r) =>
    [
      r.montant,
      `"${r.motif.replace(/"/g, '""')}"`,
      r.note ? `"${r.note.replace(/"/g, '""')}"` : "",
      `${r.agent.firstname} ${r.agent.lastname}`,
      new Date(r.createdAt).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }),
    ].join(";")
  );

  const csv = [header, ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="retraits-${date}.csv"`,
    },
  });
}
