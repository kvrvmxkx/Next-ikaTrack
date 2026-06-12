const WASENDER_API_URL = "https://www.wasenderapi.com/api/send-message";

function normalizePhone(phone: string, country?: "ML" | "CI"): string {
  let p = phone.trim().replace(/\s+/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("+")) return p;
  if (p.startsWith("223") || p.startsWith("225")) return "+" + p;
  if (country === "CI") return "+225" + p;
  return "+223" + p;
}

function isValidPhone(normalized: string): boolean {
  let local = "";
  if (normalized.startsWith("+225")) {
    local = normalized.slice(4);
  } else if (normalized.startsWith("+223")) {
    local = normalized.slice(4);
  } else {
    local = normalized.slice(1);
  }

  if (local.length < 6) return false;
  if (/^(\d)\1+$/.test(local)) return false;
  return true;
}

export async function sendSMS(
  to: string,
  body: string,
  country?: "ML" | "CI"
): Promise<{ status: number; body: string } | null> {
  const apiKey = process.env.WASENDER_API_KEY;
  if (!apiKey) {
    console.warn("[Wasender] WASENDER_API_KEY manquant — message non envoyé");
    return null;
  }

  const normalized = normalizePhone(to, country);
  if (!isValidPhone(normalized)) {
    console.warn(`[Wasender] Numéro invalide ou factice ignoré : ${normalized}`);
    return null;
  }

  try {
    const res = await fetch(WASENDER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: normalized, text: body }),
    });

    const responseText = await res.text();
    if (!res.ok) {
      console.error(`[Wasender] Erreur ${res.status}: ${responseText}`);
    } else {
      console.log(`[Wasender] ${res.status} → ${normalized}`);
    }
    return { status: res.status, body: responseText };
  } catch (err) {
    console.error("[Wasender] Erreur envoi:", err);
    return { status: 0, body: String(err) };
  }
}

export async function sendSMSBulk(
  messages: Array<{ to: string; body: string; country?: "ML" | "CI" }>,
  delayMs = 200
): Promise<void> {
  for (const msg of messages) {
    await sendSMS(msg.to, msg.body, msg.country);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}
