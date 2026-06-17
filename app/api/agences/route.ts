import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/enums";

export async function GET() {
  try {
    const agences = await prisma.agence.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(agences);
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
    const { nom, pays, ville, email, phone } = await req.json();
    const agence = await prisma.agence.create({
      data: { nom, pays, ville, email, phone },
    });
    return NextResponse.json(agence, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
