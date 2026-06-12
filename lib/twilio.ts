import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const from       = process.env.TWILIO_ALPHA_NUMERIC_SENDER;

function normalizePhone(phone: string, country?: "ML" | "CI"): string {
  let p = phone.trim().replace(/\s+/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("+")) return p;
  if (p.startsWith("223") || p.startsWith("225")) return "+" + p;
  if (country === "CI") return "+225" + p;
  return "+223" + p;
}

function getClient() {
  return twilio(accountSid, authToken, { autoRetry: true, maxRetries: 3 });
}

export async function sendSMS(
  to: string,
  body: string,
  country?: "ML" | "CI"
): Promise<void> {
  if (!accountSid || !authToken || !from) {
    console.warn("[Twilio] Variables d'environnement manquantes — SMS non envoyé");
    return;
  }
  const normalized = normalizePhone(to, country);
  try {
    await getClient().messages.create({ body, from, to: normalized });
  } catch (err) {
    console.error("[Twilio] Erreur envoi SMS:", err);
  }
}

// 150ms entre chaque appel = ~6 req/s, dans la limite des alpha sender ML/CI
export async function sendSMSBulk(
  messages: Array<{ to: string; body: string; country?: "ML" | "CI" }>,
  delayMs = 150
): Promise<void> {
  for (const msg of messages) {
    await sendSMS(msg.to, msg.body, msg.country);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}
