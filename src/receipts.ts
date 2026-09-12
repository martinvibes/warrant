/**
 * Proof that a purchase happened.
 *
 * A settlement id on its own is a pointer into a mirror node that may or may
 * not answer, and a row in this service's database is just our word for it. A
 * receipt is the middle thing: a small document naming what was bought, by
 * whom, for how much and against which settlement, signed by the service's own
 * key so anyone holding it can check it without asking us anything.
 *
 * The signature covers a canonical digest rather than the JSON, so reordering
 * the fields or reformatting the document cannot change what was signed.
 *
 * Verifying one needs no code from here:
 *
 *   digest    = sha256(version|id|agent|kind|resource|amount|asset|network|settlement|issuedAt)
 *   signer    = viem.recoverMessageAddress({ message: digest, signature })
 *   signer === the issuer address published at /v1/contracts
 */
import crypto from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { config } from "./config.js";
import { purchaseByReceipt, purchaseBySettlement, type PurchaseRow } from "./store/db.js";

export const RECEIPT_VERSION = "warrant-receipt-1";

export interface Receipt {
  version: string;
  id: string;
  agent: string;
  kind: string;
  resource: string;
  /** Smallest unit of the asset, as a string so nothing rounds. */
  amount: string;
  asset: string;
  network: string;
  /** The x402 settlement this receipt is evidence of. */
  settlement: string | null;
  issuedAt: string;
  issuer: string;
  digest: string;
  signature: string;
  explorer?: string;
}

/** The exact bytes that get signed. Order is part of the contract. */
export function digestOf(r: Omit<Receipt, "digest" | "signature" | "explorer">): string {
  const canonical = [
    r.version,
    r.id,
    r.agent,
    r.kind,
    r.resource,
    r.amount,
    r.asset,
    r.network,
    r.settlement ?? "",
    r.issuedAt,
  ].join("|");
  return `0x${crypto.createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

function issuer(): ReturnType<typeof privateKeyToAccount> | undefined {
  if (!config.servicePrivateKey) return undefined;
  return privateKeyToAccount(config.servicePrivateKey as Hex);
}

/** The address a receipt's signature should recover to. Published, not secret. */
export function issuerAddress(): string | undefined {
  return issuer()?.address;
}

export interface ReceiptInput {
  id: string;
  agent: string;
  kind: string;
  resource: string;
  amount: string;
  asset: string;
  network: string;
  settlement: string | null;
  issuedAt: number;
}

/**
 * Signs a receipt.
 *
 * Unsigned is a real outcome rather than an error: a service running without
 * an EVM key can still sell things, and a receipt that says plainly it carries
 * no signature is more useful than no receipt at all.
 */
export async function sign(input: ReceiptInput): Promise<Receipt> {
  const account = issuer();
  const unsigned = {
    version: RECEIPT_VERSION,
    id: input.id,
    agent: input.agent,
    kind: input.kind,
    resource: input.resource,
    amount: input.amount,
    asset: input.asset,
    network: input.network,
    settlement: input.settlement,
    issuedAt: new Date(input.issuedAt).toISOString(),
    issuer: account?.address ?? "unsigned",
  };
  const digest = digestOf(unsigned);
  const signature = account ? await account.signMessage({ message: digest }) : "";
  return {
    ...unsigned,
    digest,
    signature,
    ...(input.settlement
      ? { explorer: `https://hashscan.io/${config.hederaNetwork}/transaction/${input.settlement}` }
      : {}),
  };
}

/** A short, sortable, unguessable id. Time first so the ledger reads in order. */
export function newReceiptId(): string {
  return `rcp_${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`;
}

export function fromRow(row: PurchaseRow): Receipt {
  return {
    version: RECEIPT_VERSION,
    id: row.receipt_id ?? `rcp_row_${row.id}`,
    agent: row.agent,
    kind: row.kind,
    resource: row.resource ?? "",
    amount: row.amount,
    asset: row.asset,
    network: row.network,
    settlement: row.tx_id,
    issuedAt: new Date(row.created_at).toISOString(),
    issuer: issuerAddress() ?? "unsigned",
    digest: row.digest ?? "",
    signature: row.signature ?? "",
    ...(row.tx_id
      ? { explorer: `https://hashscan.io/${config.hederaNetwork}/transaction/${row.tx_id}` }
      : {}),
  };
}

export function lookup(receiptId: string): Receipt | undefined {
  const row = purchaseByReceipt(receiptId);
  return row ? fromRow(row) : undefined;
}

/**
 * Why a receipt is fetched rather than returned with the thing it paid for.
 *
 * The payment middleware buffers the handler's response and settles after the
 * handler has already written its body. So at the moment the resource answers,
 * the settlement it will be evidence of does not exist yet, and a receipt
 * embedded in that body could not name it.
 *
 * The response does carry the settlement id in its PAYMENT-RESPONSE header, so
 * a buyer holding that has everything needed to collect the receipt from
 * /v1/receipts?settlement=... a moment later. Fetching one costs nothing and
 * needs no authentication, because a receipt whose holder must prove who they
 * are is not proof of anything to anyone else.
 */
export function bySettlement(txId: string): Receipt | undefined {
  const row = purchaseBySettlement(txId);
  return row ? fromRow(row) : undefined;
}
