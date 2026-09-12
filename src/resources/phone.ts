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

export interface NumberOption {
  phoneNumber: string;
  country: string;
  /** Where the number is, as the provider describes it. */
  region: string;
  /** Monthly rental and the one-off, in the provider's currency. */
  monthly: string | null;
  upfront: string | null;
  currency: string | null;
  features: string[];
}

/**
 * What is available to buy right now.
 *
 * Searching is free and unpriced. Charging to look at a catalogue would be a
 * strange way to sell anything, and an agent that cannot see the prices before
 * it commits is not really choosing.
 */
export async function searchNumbers(opts: {
  country?: string;
  areaCode?: string;
  contains?: string;
  limit?: number;
} = {}): Promise<NumberOption[]> {
  try {
    return await search(opts, false);
  } catch (err) {
    // A narrow filter that matches nothing is the common case, and the
    // provider says so by name. Widening once beats handing back an error
    // that tells an agent to go and read the provider's documentation.
    if (!/best_effort/i.test((err as Error).message)) throw err;
    return search(opts, true);
  }
}

async function search(
  opts: { country?: string; areaCode?: string; contains?: string; limit?: number },
  bestEffort: boolean,
): Promise<NumberOption[]> {
  const query = new URLSearchParams({
    "filter[country_code]": (opts.country ?? "US").toUpperCase(),
    "filter[limit]": String(Math.min(Math.max(opts.limit ?? 10, 1), 50)),
    "filter[features][]": "sms",
  });
  if (opts.areaCode) query.set("filter[national_destination_code]", opts.areaCode);
  if (opts.contains) query.set("filter[phone_number][contains]", opts.contains);
  if (bestEffort) query.set("filter[best_effort]", "true");

  const body = await telnyx<{ data?: RawNumber[] }>(`/available_phone_numbers?${query}`);
  return (body.data ?? []).map(toOption);
}

interface RawNumber {
  phone_number: string;
  country_code?: string;
  features?: { name: string }[];
  region_information?: { region_name?: string; region_type?: string }[];
  cost_information?: { monthly_cost?: string; upfront_cost?: string; currency?: string };
}

function toOption(n: RawNumber): NumberOption {
  const regions = n.region_information ?? [];
  const named =
    regions.find((r) => r.region_type === "location") ??
    regions.find((r) => r.region_type === "rate_center") ??
    regions[0];
  const state = regions.find((r) => r.region_type === "state")?.region_name;
  const cost = n.cost_information ?? {};
  return {
    phoneNumber: n.phone_number,
    country: n.country_code ?? "US",
    region: [named?.region_name, state].filter(Boolean).join(", "),
    monthly: cost.monthly_cost ?? null,
    upfront: cost.upfront_cost ?? null,
    currency: cost.currency ?? null,
    features: (n.features ?? []).map((f) => f.name),
  };
}

export interface ProvisionedNumber {
  phoneNumber: string;
  country: string;
  orderId: string;
  agent: string;
}

export async function provisionNumber(
  agent: string,
  countryCode = "US",
  wanted?: string,
): Promise<ProvisionedNumber> {
  // Ordering the number the agent was quoted, rather than whatever a fresh
  // search returns, is the difference between choosing and being assigned.
  const found = wanted
    ? { phoneNumber: wanted, country: countryCode.toUpperCase() }
    : await findNumber(countryCode);

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
