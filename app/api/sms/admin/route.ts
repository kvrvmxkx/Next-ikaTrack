import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Roles } from "@/lib/enums";

const ORANGE_ADMIN = "https://api.orange.com/sms/admin/v1";
const TOKEN_URL    = "https://api.orange.com/oauth/v3/token";

// Token cache partagé avec lib/sms.ts (module séparé ici pour ne pas importer de state)
let tokenCache: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value;
  }
  const credentials = Buffer.from(
    `${process.env.ORANGE_CLIENT_ID}:${process.env.ORANGE_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization:  `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept:         "application/json",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`OAuth ${res.status}: ${await res.text()}`);
  const data = await res.json();
  tokenCache = {
    value:     data.access_token,
    expiresAt: Date.now() + parseInt(data.expires_in) * 1000,
  };
  return tokenCache.value;
}

async function orangeGet(path: string) {
  const token = await getToken();
  const res = await fetch(`${ORANGE_ADMIN}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Orange ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as any).role !== Roles.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [contracts, statistics, purchaseorders] = await Promise.all([
      orangeGet("/contracts"),
      orangeGet("/statistics"),
      orangeGet("/purchaseorders"),
    ]);

    return NextResponse.json({ contracts, statistics, purchaseorders });
  } catch (err) {
    console.error("[Orange Admin]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
