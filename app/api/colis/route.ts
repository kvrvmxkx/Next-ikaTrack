import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { generateColisCode, generatePublicToken } from "@/lib/utils";
import { Roles, StatutColis, isAdmin } from "@/lib/enums";
import { sendSMS } from "@/lib/sms";
import { getEtablissement } from "@/lib/settings";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    let colis;
    const role = (session.user as any).role;

    if (isAdmin(role) || role === Roles.AGENT_CHINE) {
      colis = await prisma.colis.findMany({
        orderBy: { createdAt: "desc" },
        include: { agent: true, agenceOrigine: true, agenceDestination: true },
      });
    } else if (role === Roles.AGENT_MALI) {
      colis = await prisma.colis.findMany({
        where: { destination: "MALI" },
        orderBy: { createdAt: "desc" },
        include: { agent: true, agenceOrigine: true, agenceDestination: true },
      });
    } else if (role === Roles.AGENT_CI) {
      colis = await prisma.colis.findMany({
        where: { destination: "COTE_DIVOIRE" },
        orderBy: { createdAt: "desc" },
        include: { agent: true, agenceOrigine: true, agenceDestination: true },
      });
    }

    return NextResponse.json(colis ?? []);
  } catch (error) {
    console.error("Failed to fetch colis:", error);
    return NextResponse.json({ error: "Failed to fetch colis" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const {
      description,
      poids,
      nombreColis,
      destination,
      expediteurEstFournisseur,
      expediteurNom,
      expediteurPhone,
      destinataireNom,
      destinatairePhone,
      destinataireVille,
      destinataireAdresse,
      prixTotal,
      avance,
      notes,
      tarifId,
      agenceOrigineId,
      agenceDestinationId,
      express,
    } = await request.json();

    if (!poids || !destination || !destinataireNom || !destinatairePhone) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (!expediteurEstFournisseur && (!expediteurNom || !expediteurPhone)) {
      return NextResponse.json({ error: "Informations expéditeur requises" }, { status: 400 });
    }

    const avanceVal    = parseFloat(avance ?? 0);
    const prixTotalVal = parseFloat(prixTotal ?? 0);
    const solde        = Math.max(0, prixTotalVal - avanceVal);

    // Générer un code unique — retry en cas de collision
    let code: string;
    let attempts = 0;
    do {
      code = generateColisCode(destination);
      const existing = await prisma.colis.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const colis = await prisma.colis.create({
      data: {
        code,
        tokenPublic: generatePublicToken(),
        description,
        poids: parseFloat(poids),
        nombreColis: nombreColis ? parseInt(nombreColis) : 1,
        destination,
        expediteurEstFournisseur: !!expediteurEstFournisseur,
        expediteurNom: expediteurNom ?? "",
        expediteurPhone: expediteurPhone ?? "",
        destinataireNom,
        destinatairePhone,
        destinataireVille,
        destinataireAdresse,
        prixTotal: prixTotalVal,
        avance:    avanceVal,
        solde,
        avancePaye: avanceVal > 0,
        soldePaye:  false,
        express:    !!express,
        notes,
        tarifId:              tarifId             ? parseInt(tarifId)              : null,
        agenceOrigineId:      agenceOrigineId      ? parseInt(agenceOrigineId)      : null,
        agenceDestinationId:  agenceDestinationId  ? parseInt(agenceDestinationId)  : null,
        agentId: session.user.id,
      },
    });

    // Historique initial
    await prisma.colisHistorique.create({
      data: {
        colisId: colis.id,
        statut:  StatutColis.ENREGISTRE,
        note:    "Colis enregistré",
        agentId: session.user.id,
      },
    });

    // Enregistrer l'avance comme paiement si > 0
    if (avanceVal > 0) {
      await prisma.paiement.create({
        data: {
          colisId: colis.id,
          type:    "AVANCE",
          montant: avanceVal,
          note:    "Avance à l'enregistrement",
          agentId: session.user.id,
        },
      });
    }

    // SMS notifications (fire & forget)
    prisma.colis.findUnique({ where: { id: colis.id } })
      .then(async (c) => {
        if (!c) return;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const suivi  = `${appUrl}/suivi/${c.tokenPublic}`;
        const nom    = await getEtablissement();
        const sig    = `\n— ${nom}`;
        const country = c.destination === "COTE_DIVOIRE" ? "CI" as const : "ML" as const;
        const tasks  = [
          sendSMS(c.destinatairePhone, `Un colis vous est destiné depuis la Chine. Code: ${c.code}. Suivez: ${suivi}${sig}`, country),
        ];
        if (!c.expediteurEstFournisseur && c.expediteurPhone) {
          tasks.push(sendSMS(c.expediteurPhone, `Votre colis a été enregistré. Code: ${c.code}. Suivi: ${suivi}${sig}`, country));
        }
        await Promise.all(tasks);
      })
      .catch((err) => console.error("SMS error:", err));

    return NextResponse.json(colis, { status: 201 });
  } catch (error) {
    console.error("Failed to create colis:", error);
    return NextResponse.json({ error: "Failed to create colis" }, { status: 500 });
  }
}
