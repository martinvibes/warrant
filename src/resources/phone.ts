/**
 * Real phone numbers, bought by an agent.
 *
 * A number is the one resource here that cannot be undone: ordering costs
 * money at the provider whether or not the caller likes the result. So the
 * search and the order are separate steps internally, and the number that gets
 * ordered is the one the agent was quoted, never whatever the search returns
 * second time around.
 */
import { config } from "../config.js";
import { rememberNumber, numbersOf } from "../store/db.js";

const TELNYX = "https://api.telnyx.com/v2";

async function telnyx<T>(path: string, init?: RequestInit): Promise<T> {
  if (!config.telnyxKey) throw new Error("TELNYX_API_KEY is not set, so numbers cannot be sold.");

  const res = await fetch(`${TELNYX}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.telnyxKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    // Telnyx reports the useful part in a JSON errors array; surface it rather
    // than a bare status the caller cannot act on.
    let detail = text.slice(0, 300);
    try {
      const body = JSON.parse(text) as { errors?: { detail?: string; title?: string }[] };
      const first = body.errors?.[0];
      if (first) detail = first.detail ?? first.title ?? detail;
    } catch {
      /* keep the raw body */
    }
    throw new Error(`the number provider refused: ${detail}`);
  }
  return JSON.parse(text) as T;
}

export interface AvailableNumber {
  phoneNumber: string;
  country: string;
}

/** Finds one number that can actually be ordered right now. */
export async function findNumber(countryCode = "US"): Promise<AvailableNumber> {
  const query = new URLSearchParams({
    "filter[country_code]": countryCode.toUpperCase(),
    "filter[limit]": "1",
    "filter[features][]": "sms",
  });
  const body = await telnyx<{ data?: { phone_number: string; country_code: string }[] }>(
    `/available_phone_numbers?${query}`,
  );
  const first = body.data?.[0];
  if (!first) throw new Error(`No numbers are available in ${countryCode.toUpperCase()} right now.`);
  return { phoneNumber: first.phone_number, country: first.country_code };
}

export interface ProvisionedNumber {
  phoneNumber: string;
  country: string;
  orderId: string;
  agent: string;
}

export async function provisionNumber(agent: string, countryCode = "US"): Promise<ProvisionedNumber> {
  const found = await findNumber(countryCode);

  const order = await telnyx<{ data?: { id: string; status: string } }>("/number_orders", {
    method: "POST",
    body: JSON.stringify({
      phone_numbers: [{ phone_number: found.phoneNumber }],
      ...(config.telnyxProfileId ? { messaging_profile_id: config.telnyxProfileId } : {}),
    }),
  });

  const orderId = order.data?.id;
  if (!orderId) throw new Error("The provider accepted the order but returned no order id.");

  rememberNumber({
    number: found.phoneNumber,
    agent,
    country: found.country,
    provider_id: orderId,
  });

  return { phoneNumber: found.phoneNumber, country: found.country, orderId, agent };
}

export function numbersFor(agent: string) {
  return numbersOf(agent).map((r) => ({
    phoneNumber: r.number,
    country: r.country,
    provisionedAt: new Date(r.created_at).toISOString(),
  }));
}

export interface SmsRequest {
  from: string;
  to: string;
  text: string;
}

export async function sendSms(agent: string, req: SmsRequest): Promise<{ messageId: string; to: string }> {
  const owned = numbersOf(agent).some((r) => r.number === req.from);
  if (!owned) {
    throw new Error(`${req.from} is not a number you provisioned. Send from one you own.`);
  }

  const body = await telnyx<{ data?: { id: string } }>("/messages", {
    method: "POST",
    body: JSON.stringify({
      from: req.from,
      to: req.to,
      text: req.text,
      ...(config.telnyxProfileId ? { messaging_profile_id: config.telnyxProfileId } : {}),
    }),
  });

  return { messageId: body.data?.id ?? "", to: req.to };
}
