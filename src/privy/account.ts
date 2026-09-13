/**
 * A Privy server wallet, dressed as a viem account.
 *
 * Everything upstream of this file — the treasury draw, the settlement record
 * — is written against viem and should not have to know where the key lives.
 * So the whole Privy dependency is one adapter: viem hands us a transaction,
 * Privy signs it, and the signed bytes go back out to Hedera the same way they
 * always did. Warrant never holds the key and never broadcasts on Privy's
 * behalf; it asks for a signature and puts it on the wire itself.
 */
import { toAccount } from "viem/accounts";
import type { Address, Hex, LocalAccount } from "viem";
import { walletRpc } from "./client.js";

/** Privy takes plain numbers, not the bigints viem works in. */
function num(value: bigint | number | undefined, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  return typeof value === "bigint" ? Number(value) : value;
}

interface SignedTransaction {
  data: { signed_transaction: Hex };
}

interface Signature {
  data: { signature: Hex };
}

/**
 * Wraps a Privy wallet id and its address in the account interface viem's
 * wallet client expects.
 *
 * The address is passed in rather than fetched because a signer that has to
 * make a network call to learn its own address is a signer that fails to
 * construct when Privy is briefly unreachable, which is the wrong moment for
 * that to matter.
 */
export function privyAccount(walletId: string, address: Address): LocalAccount {
  return toAccount({
    address,

    async signTransaction(transaction) {
      const { data } = await walletRpc<SignedTransaction>(walletId, "eth_signTransaction", {
        transaction: {
          to: transaction.to ?? undefined,
          data: transaction.data ?? "0x",
          value: num(transaction.value),
          nonce: num(transaction.nonce),
          chain_id: num(transaction.chainId),
          gas_limit: num(transaction.gas),
          max_fee_per_gas: num(transaction.maxFeePerGas),
          max_priority_fee_per_gas: num(transaction.maxPriorityFeePerGas),
          type: 2,
        },
      });
      return data.signed_transaction;
    },

    async signMessage({ message }) {
      const text =
        typeof message === "string"
          ? message
          : "raw" in message && typeof message.raw === "string"
            ? message.raw
            : Buffer.from(message.raw as Uint8Array).toString("utf-8");
      const { data } = await walletRpc<Signature>(walletId, "personal_sign", {
        message: text,
        encoding: typeof message === "string" ? "utf-8" : "hex",
      });
      return data.signature;
    },

    async signTypedData(typedData) {
      const { data } = await walletRpc<Signature>(walletId, "eth_signTypedData_v4", {
        typed_data: typedData,
      });
      return data.signature;
    },
  }) as LocalAccount;
}
