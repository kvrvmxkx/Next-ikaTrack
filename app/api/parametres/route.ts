import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Roles, isAdmin } from "@/lib/enums";

const BOOL_KEYS          = ["agentsCanEditColis", "agentsCanDeleteColis", "maintenanceMode"] as const;
const SUPER_ADMIN_KEYS   = ["maintenanceMode"] as const;
const STR_KEYS           = ["etablissement"] as const;

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [...BOOL_KEYS, ...STR_KEYS] } },
  });

  const result: Record<string, boolean | string> = {
    agentsCanEditColis:   false,
    agentsCanDeleteColis: false,
    maintenanceMode:      false,
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
  if (!session || !isAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const callerRole = (session.user as any).role;
  const body = await req.json();

  const allowedBoolKeys = BOOL_KEYS.filter((k) => {
    if ((SUPER_ADMIN_KEYS as readonly string[]).includes(k)) {
      return callerRole === Roles.SUPER_ADMIN;
    }
    return true;
  });

  await Promise.all([
    ...allowedBoolKeys.filter((k) => k in body).map((k) =>
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
