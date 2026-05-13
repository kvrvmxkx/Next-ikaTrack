import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sendSMS } from "@/lib/sms";
import { getEtablissement } from "@/lib/settings";
import { getStatutText } from "@/lib/utils";
import { StatutColis } from "@/lib/enums";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { statut, note } = await req.json();

    if (!statut) {
      return NextResponse.json({ error: "Statut requis" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { statut };

    if (statut === StatutColis.LIVRE) {
      const current = await prisma.colis.findUnique({
        where: { code },
        select: { soldePaye: true },
      });
      if (current && !current.soldePaye) {
        updateData.remisEnDette = true;
      }
    }

    const colis = await prisma.colis.update({
      where: { code },
      data: updateData,
    });

    // Historique
    await prisma.colisHistorique.create({
      data: {
        colisId: colis.id,
        statut,
        note: note ?? null,
        agentId: session.user.id,
      },
    });

    // SMS notification (fire & forget)
    prisma.colis
      .findUnique({ where: { id: colis.id } })
      .then(async (c) => {
        if (!c) return;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const nom    = await getEtablissement();
        const msg    = `Votre colis ${c.code} est maintenant: ${getStatutText(statut)}. Suivi: ${appUrl}/suivi/${c.tokenPublic}\n— ${nom}`;
        await sendSMS(c.destinatairePhone, msg);
      })
      .catch((err) => console.error("SMS error:", err));

    return NextResponse.json(colis);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
