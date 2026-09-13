/**
 * Paying on Hedera with a key this process does not have.
 *
 * x402's own client signer takes a PrivateKey, which is fine when the key is a
 * hex string in .env and useless when the point is that it is not. But the
 * signer it returns satisfies a small interface, so this file implements that
 * interface instead and routes the one signature it needs through Privy.
 *
 * Hedera's ECDSA signatures are secp256k1 over keccak256 of the body, which is
 * exactly the primitive Privy exposes as `secp256k1_sign`. So the agent's
 * Hedera account and its EVM address are the same key, held in the same place:
 * one wallet, one identity, two networks.
 */
import {
  AccountId,
  Hbar,
  TokenId,
  TransactionId,
  TransferTransaction,
  createHederaClient,
  isHbarAsset,
  type ClientHederaSigner,
} from "@x402/hedera";
// The same hoisted @hiero-ledger/sdk instance @x402/hedera resolves to, so the
// PublicKey handed to signWith is the type the frozen transaction expects.
import { PublicKey } from "@hiero-ledger/sdk";
import { hexToBytes, keccak256, recoverPublicKey, toHex, type Address, type Hex } from "viem";
import { walletRpc } from "./client.js";

/** A statement the wallet signs only so its public key can be read back. */
const KEY_PROOF = "warrant/agent-key";

export interface AgentKey {
  /** Uncompressed secp256k1 point, 0x04-prefixed. */
  uncompressed: Hex;
  /** Compressed form, which is how Hedera carries an ECDSA key. */
  compressed: string;
  /** The EVM address this key derives, and the wallet's own address. */
  address: Address;
}

/**
 * Reads a Privy wallet's public key.
 *
 * Privy will hand out an address but not a public key, and Hedera needs the
 * key itself to build an account. A signature contains it: recovering from one
 * costs nothing on chain and proves the wallet holds the key at the same time.
 */
export async function agentPublicKey(walletId: string): Promise<AgentKey> {
  const hash = keccak256(toHex(KEY_PROOF));
  const { data } = await walletRpc<{ data: { signature: Hex } }>(walletId, "secp256k1_sign", { hash });
  const uncompressed = await recoverPublicKey({ hash, signature: data.signature });

  const x = uncompressed.slice(4, 68);
  const y = uncompressed.slice(68);
  const compressed = (BigInt(`0x${y}`) % 2n === 0n ? "02" : "03") + x;
  const address = `0x${keccak256(`0x${uncompressed.slice(4)}`).slice(-40)}` as Address;

  return { uncompressed, compressed, address };
}

/** Signs 32 bytes with the wallet's key, in the compact form Hedera wants. */
export async function signHash(walletId: string, hash: Hex): Promise<Uint8Array> {
  const { data } = await walletRpc<{ data: { signature: Hex } }>(walletId, "secp256k1_sign", { hash });
  // Privy returns r‖s‖v; Hedera carries r‖s and derives nothing from v.
  return hexToBytes(data.signature).slice(0, 64);
}

export interface PrivySignerOptions {
  /** Hedera account the wallet's key controls, e.g. "0.0.12345". */
  accountId: string;
  walletId: string;
  /** Compressed public key of that wallet, from agentPublicKey. */
  publicKey: string;
  network: string;
}

/**
 * An x402 client signer that never holds a key.
 *
 * The transaction is built and frozen exactly as the SDK-backed signer builds
 * it — same transfers, same fee-payer transaction id — because the facilitator
 * verifies the payer's signature against the frozen body. Only the signing
 * step differs.
 */
export function privyHederaSigner(options: PrivySignerOptions): ClientHederaSigner {
  const payer = AccountId.fromString(options.accountId);
  const publicKey = PublicKey.fromStringECDSA(options.publicKey);

  return {
    accountId: payer.toString(),

    async createPartiallySignedTransferTransaction(requirements) {
      const feePayer = requirements.extra?.feePayer;
      if (typeof feePayer !== "string") {
        throw new Error("feePayer is required in paymentRequirements.extra");
      }
      const amount = BigInt(requirements.amount);
      if (amount <= 0n) throw new Error("amount must be greater than zero");

      const payTo = AccountId.fromString(requirements.payTo);
      const tx = new TransferTransaction();
      if (isHbarAsset(requirements.asset)) {
        tx.addHbarTransfer(payer, Hbar.fromTinybars((-amount).toString()));
        tx.addHbarTransfer(payTo, Hbar.fromTinybars(amount.toString()));
      } else {
        const token = TokenId.fromString(requirements.asset);
        tx.addTokenTransfer(token, payer, -amount);
        tx.addTokenTransfer(token, payTo, amount);
      }
      // The facilitator pays the network fee, so the transaction id is its
      // account. That is what makes the agent's HBAR balance irrelevant.
      tx.setTransactionId(TransactionId.generate(AccountId.fromString(feePayer)));

      const client = createHederaClient(options.network);
      try {
        tx.freezeWith(client);
        const signed = await tx.signWith(publicKey, (bytes) =>
          signHash(options.walletId, keccak256(toHex(bytes))),
        );
        return Buffer.from(signed.toBytes()).toString("base64");
      } finally {
        client.close();
      }
    },
  };
}
