import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/enums";

export async function GET() {
  try {
    const tarifs = await prisma.tarif.findMany({
      include: { tranches: { orderBy: { poidsMin: "asc" } } },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(tarifs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !isAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { nom, destination, express, tranches } = await req.json();

    const tarif = await prisma.tarif.create({
      data: {
        nom,
        destination,
        express: !!express,
        tranches: {
          create: tranches.map((t: { poidsMin: number; poidsMax: number | null; prixParKg: number }) => ({
            poidsMin: t.poidsMin,
            poidsMax: t.poidsMax ?? null,
            prixParKg: t.prixParKg,
          })),
        },
      },
      include: { tranches: true },
    });

    return NextResponse.json(tarif, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
