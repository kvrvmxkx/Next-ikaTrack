import { NextRequest, NextResponse } from "next/server";

// Webhook Wasender — statuts de livraison des messages WhatsApp
// À configurer dans le dashboard Wasender → Webhook URL
// URL : https://ton-domaine.com/api/sms/webhook

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body?.messageId || body?.status) {
      console.log("[Wasender Webhook]", {
        id:     body?.messageId,
        phone:  body?.phoneNumber,
        status: body?.status,
      });
    }

    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 200 });
  }
}
