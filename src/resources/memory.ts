/**
 * Agent memory, written to the Hedera File Service.
 *
 * The service this borrows the idea from put agent memory on a storage network
 * and addressed it by a root hash. The Hedera equivalent is a file, and it has
 * one property worth choosing it for: a file created with no keys cannot be
 * updated or deleted by anyone, including us. An agent that writes a memory
 * here is not trusting this service to keep it honest afterwards.
 *
 * The cost of that is the same property read the other way. Nothing can be
 * corrected and nothing can be taken back, so memory is written once and
 * superseded by writing again, never edited.
 */
import {
  AccountId,
  Client,
  FileAppendTransaction,
  FileContentsQuery,
  FileCreateTransaction,
  FileId,
  Hbar,
  PrivateKey,
} from "@hiero-ledger/sdk";
import { config } from "../config.js";

/**
 * A file create carries its first chunk inline, and the network caps a single
 * transaction well below the file size limit. Anything past this is appended.
 */
const FIRST_CHUNK_BYTES = 4096;

/** Hedera keys arrive in several encodings; accept whichever the portal gave. */
export function parseHederaKey(raw: string): PrivateKey {
  for (const attempt of [
    () => PrivateKey.fromStringECDSA(raw),
    () => PrivateKey.fromStringED25519(raw),
    () => PrivateKey.fromStringDer(raw),
  ]) {
    try {
      return attempt();
    } catch {
      /* try the next encoding */
    }
  }
  throw new Error("HEDERA_PRIVATE_KEY is not a Hedera private key in any encoding I recognise.");
}

let client: Client | undefined;

function hedera(): Client {
  if (client) return client;
  if (!config.payTo || !config.operatorKey) {
    throw new Error("Memory needs HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY so writes have an account to pay from.");
  }
  client = (config.hederaNetwork === "mainnet" ? Client.forMainnet() : Client.forTestnet()).setOperator(
    AccountId.fromString(config.payTo),
    parseHederaKey(config.operatorKey),
  );
  return client;
}

export interface MemoryWrite {
  /** Who the memory belongs to, recorded in the file memo for attribution. */
  agent: string;
  /** Arbitrary text. JSON is the obvious thing to put here, but nothing requires it. */
  content: string;
}

export interface MemoryRecord {
  fileId: string;
  bytes: number;
  /** Consensus timestamp of the create, which is when the memory became real. */
  writtenAt: string;
  immutable: true;
  explorer: string;
}

/** Writes `content` to a keyless, therefore permanent, Hedera file. */
export async function writeMemory(req: MemoryWrite): Promise<MemoryRecord> {
  const client = hedera();
  const bytes = Buffer.from(req.content, "utf8");

  // No setKeys(): the file is immutable from creation. See the note above.
  const create = await new FileCreateTransaction()
    .setContents(bytes.subarray(0, FIRST_CHUNK_BYTES))
    .setFileMemo(`warrant:memory:${req.agent}`.slice(0, 100))
    .setMaxTransactionFee(new Hbar(2))
    .execute(client);

  const receipt = await create.getReceipt(client);
  const fileId = receipt.fileId;
  if (!fileId) throw new Error("Hedera accepted the file create but returned no file id.");

  if (bytes.length > FIRST_CHUNK_BYTES) {
    // An immutable file cannot be appended to, so oversized content has to be
    // refused rather than silently truncated to its first chunk.
    throw new Error(
      `Memory is ${bytes.length} bytes. A permanent file is written in one transaction, so ${FIRST_CHUNK_BYTES} is the limit. Write it in parts and link them.`,
    );
  }

  const record = await create.getRecord(client);

  return {
    fileId: fileId.toString(),
    bytes: bytes.length,
    writtenAt: record.consensusTimestamp.toDate().toISOString(),
    immutable: true,
    explorer: explorerFile(fileId.toString()),
  };
}

/** Reads a memory back. Free, because reading a file is a query and not a transaction. */
export async function readMemory(fileId: string): Promise<{ fileId: string; content: string; bytes: number }> {
  const contents = await new FileContentsQuery().setFileId(FileId.fromString(fileId)).execute(hedera());
  return {
    fileId,
    content: Buffer.from(contents).toString("utf8"),
    bytes: contents.length,
  };
}

export function explorerFile(fileId: string): string {
  return `https://hashscan.io/${config.hederaNetwork}/file/${fileId}`;
}
