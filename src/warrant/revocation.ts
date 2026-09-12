/**
 * Revocation.
 *
 * Killing a warrant has to be faster and cheaper than issuing one, or nobody
 * will do it in the moment that matters. So a revocation is a second signed
 * message rather than a transaction: no gas, no block time, and the next
 * request under that warrant is refused.
 *
 * It is signed, not merely asserted, because "stop this agent spending" is
 * exactly the instruction an attacker would like to be able to forge in the
 * other direction — and the same signature check that proves the owner issued
 * the warrant proves the owner withdrew it.
 */
import { recoverTypedDataAddress, type Address, type Hex } from "viem";
import { domainFor } from "./warrant.js";

export const REVOCATION_TYPES = {
  Revocation: [
    { name: "warrantId", type: "bytes32" },
    { name: "owner", type: "address" },
    { name: "issuedAt", type: "uint256" },
  ],
} as const;

export interface Revocation {
  warrantId: Hex;
  owner: Address;
  issuedAt: bigint;
}

export interface SignedRevocation {
  revocation: { warrantId: Hex; owner: Address; issuedAt: string };
  signature: Hex;
}

/** Revocations older than this are rejected, so a leaked one cannot be held and replayed. */
export const REVOCATION_MAX_AGE_SECONDS = 300;

export type RevocationCheck =
  | { ok: true }
  | { ok: false; code: "bad_signature" | "stale" | "owner_mismatch"; reason: string };

export async function verifyRevocation(
  signed: SignedRevocation,
  network: string,
  expectedOwner: string,
  now = Math.floor(Date.now() / 1000),
): Promise<RevocationCheck> {
  const issuedAt = BigInt(signed.revocation.issuedAt);
  if (Number(issuedAt) < now - REVOCATION_MAX_AGE_SECONDS || Number(issuedAt) > now + 60) {
    return {
      ok: false,
      code: "stale",
      reason: `This revocation was signed at ${new Date(Number(issuedAt) * 1000).toISOString()}, outside the window this service accepts. Sign a fresh one.`,
    };
  }

  const recovered = await recoverTypedDataAddress({
    domain: domainFor(network),
    types: REVOCATION_TYPES,
    primaryType: "Revocation",
    message: {
      warrantId: signed.revocation.warrantId,
      owner: signed.revocation.owner,
      issuedAt,
    },
    signature: signed.signature,
  });

  if (recovered.toLowerCase() !== signed.revocation.owner.toLowerCase()) {
    return {
      ok: false,
      code: "bad_signature",
      reason: `The revocation names ${signed.revocation.owner} but was signed by ${recovered}.`,
    };
  }

  if (recovered.toLowerCase() !== expectedOwner.toLowerCase()) {
    return {
      ok: false,
      code: "owner_mismatch",
      reason: `Only ${expectedOwner} can revoke this warrant. This revocation came from ${recovered}.`,
    };
  }

  return { ok: true };
}
