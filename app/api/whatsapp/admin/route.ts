import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Roles } from "@/lib/enums";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as any).role !== Roles.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const phone = searchParams.get("phone") ?? undefined;

  const where = phone ? { phone: { contains: phone } } : {};

  const [logs, total, stats] = await Promise.all([
    prisma.whatsappLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
      select: {
        id:        true,
        event:     true,
        messageId: true,
        phone:     true,
        status:    true,
        message:   true,
        createdAt: true,
      },
    }),
    prisma.whatsappLog.count({ where }),
    prisma.whatsappLog.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { event: "message.status" },
    }),
  ]);

  const statsMap = Object.fromEntries(
    stats.map((s) => [s.status ?? "unknown", s._count.status])
  );

  return NextResponse.json({
    stats: {
      sent:      statsMap["sent"]      ?? 0,
      delivered: statsMap["delivered"] ?? 0,
      read:      statsMap["read"]      ?? 0,
      failed:    statsMap["failed"]    ?? 0,
    },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    logs,
  });
}