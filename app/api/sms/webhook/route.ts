import { NextRequest, NextResponse } from "next/server";

// Webhook Orange SMS — Delivery Receipts (Section 4 de la doc)
// À enregistrer sur developer.orange.com → MyApps → ton app → Delivery Receipt URL
// URL : https://ton-domaine.com/api/sms/webhook

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const info = body?.deliveryInfoNotification;

    if (info) {
      const { callbackData, deliveryInfo } = info;
      console.log("[Orange DR]", {
        id:      callbackData,
        phone:   deliveryInfo?.address,
        status:  deliveryInfo?.deliveryStatus,
      });
    }

    // Orange exige un 200 OK immédiat
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 200 });
  }
}
