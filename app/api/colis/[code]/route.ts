import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/enums";
import { calculatePrixTotal } from "@/lib/utils";
import { MAX_POIDS_KG } from "@/lib/validation-schema";

async function getSetting(key: string): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value === "true";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const colis = await prisma.colis.findUnique({
      where: { code },
      include: {
        agent: true,
        historique: {
          orderBy: { createdAt: "desc" },
          include: { agent: true },
        },
        photos: true,
        paiements: {
          include: { agent: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!colis) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(colis);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const role = (session.user as any).role;
  if (!isAdmin(role)) {
    const allowed = await getSetting("agentsCanEditColis");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const poidsVal = body.poids !== undefined ? parseFloat(body.poids) : undefined;
    if (poidsVal !== undefined && (isNaN(poidsVal) || poidsVal <= 0 || poidsVal > MAX_POIDS_KG)) {
      return NextResponse.json(
        { error: `Poids invalide (maximum ${MAX_POIDS_KG} kg) — vérifie la saisie` },
        { status: 400 }
      );
    }

    // Si le poids change, recalculer le prix à partir du tarif associé
    let prixTotal: number | undefined;
    let solde: number | undefined;
    if (poidsVal !== undefined) {
      const existing = await prisma.colis.findUnique({
        where: { code },
        include: { tarif: { include: { tranches: true } } },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (poidsVal !== existing.poids && existing.tarif) {
        prixTotal = calculatePrixTotal(poidsVal, existing.tarif.tranches);
        solde = Math.max(0, prixTotal - existing.avance);
      }
    }

    const colis = await prisma.colis.update({
      where: { code },
      data: {
        description: body.description,
        poids: poidsVal,
        prixTotal,
        solde,
        expediteurNom: body.expediteurNom,
        expediteurPhone: body.expediteurPhone,
        destinataireNom: body.destinataireNom,
        destinatairePhone: body.destinatairePhone,
        destinataireVille: body.destinataireVille,
        destinataireAdresse: body.destinataireAdresse,
        notes: body.notes,
        express: body.express !== undefined ? !!body.express : undefined,
      },
    });

    return NextResponse.json(colis);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const role = (session.user as any).role;
  if (!isAdmin(role)) {
    const allowed = await getSetting("agentsCanDeleteColis");
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.colis.delete({ where: { code } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
