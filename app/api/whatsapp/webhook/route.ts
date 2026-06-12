import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

function verifySignature(req: NextRequest): boolean {
  const secret = process.env.WASENDER_WEBHOOK_SECRET;
  if (!secret) return true; // pas de secret configuré = pas de vérification

  const signature = req.headers.get("x-webhook-signature");
  if (!signature) return false;

  try {
    const sigBuf    = Buffer.from(signature, "utf8");
    const secretBuf = Buffer.from(secret, "utf8");
    if (sigBuf.length !== secretBuf.length) return false;
    return timingSafeEqual(sigBuf, secretBuf);
  } catch {
    return false;
  }
}

// Payload Wasender — statut d'un message sortant
type StatusPayload = {
  event: "message.status";
  messageId: string;
  phoneNumber: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp?: string;
};

// Payload Wasender — message entrant
type ReceivedPayload = {
  event: "message.received";
  messageId: string;
  from: string;
  message: string;
  timestamp?: string;
};

type WasenderPayload = StatusPayload | ReceivedPayload;

export async function POST(req: NextRequest) {
  if (!verifySignature(req)) {
    return new NextResponse(null, { status: 401 });
  }

  let raw = "{}";
  try {
    raw = await req.text();
    const body = JSON.parse(raw) as WasenderPayload;

    const phone =
      "phoneNumber" in body ? body.phoneNumber : "from" in body ? body.from : "";

    await prisma.whatsappLog.create({
      data: {
        event:      body.event ?? "unknown",
        messageId:  body.messageId ?? null,
        phone,
        status:     "status" in body ? body.status : null,
        message:    "message" in body ? body.message : null,
        rawPayload: raw,
      },
    });

    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("[Wasender Webhook]", err);
    // Wasender exige toujours un 200
    return new NextResponse(null, { status: 200 });
  }
}