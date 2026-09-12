/**
 * The gate: the single decision point that turns a signed warrant plus a
 * requested purchase into an allow or a refusal.
 *
 * Kept as a pure function with no I/O so the decision is testable, and so the
 * same logic can answer "would this be allowed?" for the console without
 * actually attempting a purchase.
 */
import { fromWire, verifyWarrantSignature, warrantId, type SignedWarrant } from "./warrant.js";
import type { Hex } from "viem";

export type RefusalCode =
  | "no_warrant"
  | "malformed_warrant"
  | "bad_signature"
  | "owner_mismatch"
  | "unknown_owner"
  | "revoked"
  | "expired"
  | "resource_not_authorised"
  | "asset_mismatch"
  | "cap_exceeded";

export interface Refusal {
  allowed: false;
  code: RefusalCode;
  /** Written for whoever has to act on it: the agent's operator, not a log grepper. */
  reason: string;
  warrantId?: Hex;
  detail?: Record<string, string>;
}

export interface Allowance {
  allowed: true;
  warrantId: Hex;
  owner: string;
  agent: string;
  purpose: string;
  /** Atomic units already spent under this warrant before the current request. */
  spent: bigint;
  cap: bigint;
  remainingAfter: bigint;
}

export type Decision = Allowance | Refusal;

export interface GateRequest {
  signed: SignedWarrant | null;
  /** Resource type being bought, e.g. "inference" or "email.send". */
  resource: string;
  /** Price of this request in the settlement asset's smallest unit. */
  price: bigint;
  /** HTS token id the service will settle in. */
  asset: string;
  network: string;
  /** Spend already recorded under this warrant, in atomic units. */
  spent: bigint;
  revoked: boolean;
  /** Owners permitted to issue warrants against this service. */
  allowedOwners: string[];
  now: number;
}

export async function decide(req: GateRequest): Promise<Decision> {
  if (!req.signed) {
    return {
      allowed: false,
      code: "no_warrant",
      reason:
        "This endpoint is paid, and payment needs a warrant. Present a signed warrant in the X-Warrant header.",
    };
  }

  let w;
  try {
    w = fromWire(req.signed.warrant);
  } catch {
    return {
      allowed: false,
      code: "malformed_warrant",
      reason: "The warrant could not be read. Check that cap, expiry and nonce are integer strings.",
    };
  }

  const sig = await verifyWarrantSignature(req.signed, req.network);
  if (!sig.ok) {
    return {
      allowed: false,
      code: "bad_signature",
      reason: `The warrant names ${w.owner} as its owner but was signed by ${sig.recovered}.`,
      detail: { claimed: w.owner, recovered: sig.recovered },
    };
  }

  const id = warrantId(w, req.network);

  const owners = req.allowedOwners.map((o) => o.toLowerCase());
  if (owners.length > 0 && !owners.includes(w.owner.toLowerCase())) {
    return {
      allowed: false,
      code: "unknown_owner",
      reason: `${w.owner} is not registered to issue warrants on this service.`,
      warrantId: id,
    };
  }

  if (req.revoked) {
    return {
      allowed: false,
      code: "revoked",
      reason: "This warrant was revoked by its owner. Ask for a new one.",
      warrantId: id,
    };
  }

  if (w.expiry <= BigInt(req.now)) {
    return {
      allowed: false,
      code: "expired",
      reason: `This warrant expired at ${new Date(Number(w.expiry) * 1000).toISOString()}.`,
      warrantId: id,
    };
  }

  if (w.asset !== req.asset) {
    return {
      allowed: false,
      code: "asset_mismatch",
      reason: `This warrant authorises spending in ${w.asset}, but the service settles in ${req.asset}.`,
      warrantId: id,
    };
  }

  if (!w.resources.includes(req.resource)) {
    return {
      allowed: false,
      code: "resource_not_authorised",
      reason: `This warrant covers ${w.resources.join(", ") || "nothing"}. It does not cover ${req.resource}.`,
      warrantId: id,
      detail: { requested: req.resource, authorised: w.resources.join(",") },
    };
  }

  const after = req.spent + req.price;
  if (after > w.cap) {
    return {
      allowed: false,
      code: "cap_exceeded",
      reason: `This purchase would take spending to ${after} against a cap of ${w.cap}.`,
      warrantId: id,
      detail: { spent: req.spent.toString(), price: req.price.toString(), cap: w.cap.toString() },
    };
  }

  return {
    allowed: true,
    warrantId: id,
    owner: w.owner,
    agent: w.agent,
    purpose: w.purpose,
    spent: req.spent,
    cap: w.cap,
    remainingAfter: w.cap - after,
  };
}
