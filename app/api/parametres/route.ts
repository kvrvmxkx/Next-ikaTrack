import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Roles } from "@/lib/enums";

const BOOL_KEYS = ["agentsCanEditColis", "agentsCanDeleteColis"] as const;
const STR_KEYS  = ["etablissement"] as const;
type BoolKey = (typeof BOOL_KEYS)[number];

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [...BOOL_KEYS, ...STR_KEYS] } },
  });

  const result: Record<string, boolean | string> = {
    agentsCanEditColis:   false,
    agentsCanDeleteColis: false,
    etablissement:        "CF AirCargo",
  };

  for (const row of rows) {
    if ((BOOL_KEYS as readonly string[]).includes(row.key)) {
      result[row.key] = row.value === "true";
    } else {
      result[row.key] = row.value;
    }
  }

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as any).role !== Roles.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  await Promise.all([
    ...BOOL_KEYS.filter((k) => k in body).map((k) =>
      prisma.appSetting.upsert({
        where:  { key: k },
        update: { value: String(!!body[k]) },
        create: { key: k, value: String(!!body[k]) },
      })
    ),
    ...STR_KEYS.filter((k) => k in body && typeof body[k] === "string").map((k) =>
      prisma.appSetting.upsert({
        where:  { key: k },
        update: { value: body[k] },
        create: { key: k, value: body[k] },
      })
    ),
  ]);

  return NextResponse.json({ success: true });
}
