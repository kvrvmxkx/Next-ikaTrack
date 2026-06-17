import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Roles, isAdmin } from "@/lib/enums";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !isAdmin((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });
    return NextResponse.json(users);
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
    const { firstname, lastname, email, phone, password, role } =
      await req.json();

    const callerRole = (session.user as any).role;
    if (callerRole === Roles.ADMIN && role === Roles.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create via Better Auth
    const result = await auth.api.signUpEmail({
      body: {
        name: `${firstname} ${lastname}`,
        firstname,
        lastname,
        email,
        phone,
        password,
      },
    });

    // Set role
    await prisma.user.update({
      where: { id: result.user.id },
      data: { role, mustChangePassword: true },
    });

    return NextResponse.json(result.user, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
