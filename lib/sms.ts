const TOKEN_URL = "https://api.orange.com/oauth/v3/token";
const SMS_BASE  = "https://api.orange.com/smsmessaging/v1";

// Numéros expéditeurs Orange fixes par pays (fournis par Orange)
const SENDER_ML = "+2230000";
const SENDER_CI = "+2250000";

type TokenCache = { value: string; expiresAt: number } | null;

// Cache séparé par pays
const tokenCaches: Record<"ML" | "CI", TokenCache> = { ML: null, CI: null };

function getCredentials(country: "ML" | "CI") {
  if (country === "CI") {
    return {
      clientId:     process.env.ORANGE_CLIENT_ID_CI,
      clientSecret: process.env.ORANGE_CLIENT_SECRET_CI,
    };
  }
  return {
    clientId:     process.env.ORANGE_CLIENT_ID_ML,
    clientSecret: process.env.ORANGE_CLIENT_SECRET_ML,
  };
}

async function getAccessToken(country: "ML" | "CI"): Promise<string> {
  const cache = tokenCaches[country];
  if (cache && Date.now() < cache.expiresAt - 60_000) {
    return cache.value;
  }

  const { clientId, clientSecret } = getCredentials(country);
  if (!clientId || !clientSecret) {
    throw new Error(`ORANGE_CLIENT_ID_${country} / ORANGE_CLIENT_SECRET_${country} manquants`);
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization:  `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept:         "application/json",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Orange OAuth (${country}) ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  tokenCaches[country] = {
    value:     data.access_token,
    expiresAt: Date.now() + parseInt(data.expires_in) * 1000,
  };

  return tokenCaches[country]!.value;
}

function normalizePhone(phone: string, country?: "ML" | "CI"): string {
  let p = phone.trim().replace(/\s+/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("+")) return p;
  if (p.startsWith("223") || p.startsWith("225")) return "+" + p;
  if (country === "CI") return "+225" + p;
  return "+223" + p;
}

function detectCountry(normalized: string): "ML" | "CI" {
  return normalized.startsWith("+225") ? "CI" : "ML";
}

// Vérifie que le numéro est valide et non factice
function isValidPhone(normalized: string): boolean {
  // Extraire les chiffres après l'indicatif pays
  let local = "";
  if (normalized.startsWith("+225")) {
    local = normalized.slice(4); // CI : 10 chiffres attendus
  } else if (normalized.startsWith("+223")) {
    local = normalized.slice(4); // Mali : 8 chiffres attendus
  } else {
    local = normalized.slice(1);
  }

  if (local.length < 6) return false;

  // Rejeter si tous les chiffres sont identiques (ex: 00000000, 11111111)
  if (/^(\d)\1+$/.test(local)) return false;

  return true;
}

export async function sendSMS(
  to: string,
  body: string,
  country?: "ML" | "CI"
): Promise<{ status: number; body: string } | null> {
  const normalized = normalizePhone(to, country);
  const dest       = detectCountry(normalized);

  if (!isValidPhone(normalized)) {
    console.warn(`[Orange SMS] Numéro invalide ou factice ignoré : ${normalized}`);
    return null;
  }

  const { clientId, clientSecret } = getCredentials(dest);
  if (!clientId || !clientSecret) {
    console.warn(`[Orange SMS] Credentials manquants pour ${dest} — SMS non envoyé`);
    return null;
  }

  const sender = dest === "CI" ? SENDER_CI : SENDER_ML;

  try {
    const token       = await getAccessToken(dest);
    const senderInUrl = encodeURIComponent(`tel:${sender}`);

    const payload = {
      outboundSMSMessageRequest: {
        address:       `tel:${normalized}`,
        senderAddress: `tel:${sender}`,
        outboundSMSTextMessage: { message: body },
      },
    };

    const res = await fetch(`${SMS_BASE}/outbound/${senderInUrl}/requests`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    if (!res.ok) {
      console.error(`[Orange SMS ${dest}] Erreur ${res.status}: ${responseText}`);
    } else {
      console.log(`[Orange SMS ${dest}] ${res.status} →`, responseText);
    }
    return { status: res.status, body: responseText };
  } catch (err) {
    console.error(`[Orange SMS ${dest}] Erreur envoi:`, err);
    return { status: 0, body: String(err) };
  }
}

// 200ms entre chaque appel = 5 req/s (limite Orange)
export async function sendSMSBulk(
  messages: Array<{ to: string; body: string; country?: "ML" | "CI" }>,
  delayMs = 200
): Promise<void> {
  for (const msg of messages) {
    await sendSMS(msg.to, msg.body, msg.country);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}
