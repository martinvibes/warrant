/**
 * Browser-side x402 payment client.
 *
 * Each paid action flows:
 *   1. POST/GET to the backend without payment → returns 402 challenge
 *   2. Use the agent's wallet (ethers) to call ZeroGentPayment.pay(nonce, type) on-chain
 *   3. Wait one confirmation
 *   4. Retry the original request with `X-Payment: {txHash, nonce}` header
 *   5. Return the success body
 *
 * Mirrors the SDK's payment loop but runs entirely in the browser, using the
 * private key the user holds locally (never sent over the network).
 */

import { ethers } from 'ethers';
import { API_URL } from './api';

const RPC_URL = (import.meta.env.VITE_ZG_RPC_URL as string) || 'https://evmrpc.0g.ai';

const PAYMENT_ABI = [
  'function pay(bytes32 nonce, string calldata resourceType) external payable',
];

export type PaymentStatus =
  | { kind: 'idle' }
  | { kind: 'requesting' }      // initial request to backend
  | { kind: 'challenged'; amount0G: string }  // got the 402, about to pay
  | { kind: 'signing'; amount0G: string }     // signing tx
  | { kind: 'broadcasting'; amount0G: string; txHash: string }
  | { kind: 'verifying'; amount0G: string; txHash: string }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export interface AgentClient {
  address: string;
  free<T = any>(method: string, path: string, body?: any): Promise<T>;
  paid<T = any>(
    method: string,
    path: string,
    body: any,
    onStatus?: (s: PaymentStatus) => void
  ): Promise<T>;
}

export function createAgentClient(privateKey: string): AgentClient {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);

  async function requestJson(method: string, path: string, body: any, headers: Record<string, string> = {}) {
    const res = await fetch(API_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let json: any = null;
    try { json = await res.json(); } catch { json = null; }
    return { status: res.status, body: json };
  }

  async function free<T = any>(method: string, path: string, body?: any): Promise<T> {
    const r = await requestJson(method, path, body);
    if (r.status >= 400) {
      throw new Error((r.body?.error as string) || `HTTP ${r.status}`);
    }
    return r.body as T;
  }

  async function paid<T = any>(
    method: string,
    path: string,
    body: any,
    onStatus: (s: PaymentStatus) => void = () => {}
  ): Promise<T> {
    onStatus({ kind: 'requesting' });

    // Step 1 — challenge
    const challenge = await requestJson(method, path, body);

    if (challenge.status === 200) {
      // Free for this caller, no payment needed
      onStatus({ kind: 'success' });
      return challenge.body as T;
    }
    if (challenge.status !== 402) {
      const msg = challenge.body?.error || `HTTP ${challenge.status}`;
      onStatus({ kind: 'error', message: msg });
      throw new Error(msg);
    }

    const ch = challenge.body;
    const contract = ch?.payment?.contract as string;
    const nonce    = ch?.nonce as string;
    const valueWei = ch?.payment?.value as string;
    const resourceType = ch?.payment?.args?.resourceType as string;
    const amount0G = ch?.amountHuman || `${ethers.formatEther(valueWei || '0')} 0G`;

    if (!contract || !nonce || !valueWei || !resourceType) {
      const msg = '402 challenge missing required fields';
      onStatus({ kind: 'error', message: msg });
      throw new Error(msg);
    }

    onStatus({ kind: 'challenged', amount0G });

    // Step 2 — sign tx
    const paymentContract = new ethers.Contract(contract, PAYMENT_ABI, wallet);
    let tx;
    try {
      onStatus({ kind: 'signing', amount0G });
      tx = await paymentContract.pay(nonce, resourceType, { value: valueWei });
    } catch (e: any) {
      const msg = humanizeEthersError(e);
      onStatus({ kind: 'error', message: msg });
      throw new Error(msg);
    }

    onStatus({ kind: 'broadcasting', amount0G, txHash: tx.hash });

    // Step 3 — wait for one confirmation
    try {
      await tx.wait(1);
    } catch (e: any) {
      const msg = humanizeEthersError(e);
      onStatus({ kind: 'error', message: msg });
      throw new Error(msg);
    }

    onStatus({ kind: 'verifying', amount0G, txHash: tx.hash });

    // Step 4 — retry with X-Payment header
    const result = await requestJson(method, path, body, {
      'X-Payment': JSON.stringify({ txHash: tx.hash, nonce }),
    });

    if (result.status >= 400) {
      const msg = result.body?.error || `HTTP ${result.status}`;
      onStatus({ kind: 'error', message: msg });
      throw new Error(msg);
    }

    onStatus({ kind: 'success' });
    return result.body as T;
  }

  return {
    address: wallet.address,
    free,
    paid,
  };
}

function humanizeEthersError(e: any): string {
  const raw = String(e?.message || e);
  if (/insufficient funds/i.test(raw))    return 'Not enough 0G in your wallet to cover this payment.';
  if (/user rejected/i.test(raw))         return 'Transaction rejected.';
  if (/nonce/i.test(raw) && /low|known|already/i.test(raw)) return 'Nonce conflict — try again.';
  if (/timeout/i.test(raw))               return 'Transaction took too long to confirm. Check chainscan.';
  if (/no matching receipts/i.test(raw))  return '0G Chain RPC hiccup — your transaction may still settle. Refresh and retry.';
  // Strip the noisy ethers wrapper
  return raw.replace(/\(.*?version=.*?\)/g, '').trim().slice(0, 240);
}

/**
 * Simple human-readable status text for use in toasts / inline messages.
 */
export function statusText(s: PaymentStatus): string {
  switch (s.kind) {
    case 'idle':         return '';
    case 'requesting':   return 'Asking server…';
    case 'challenged':   return `402 received · paying ${s.amount0G}`;
    case 'signing':      return `Signing payment of ${s.amount0G}…`;
    case 'broadcasting': return `Submitted ${s.txHash.slice(0, 10)}… · waiting for confirmation`;
    case 'verifying':    return 'Verifying payment with backend…';
    case 'success':      return 'Done.';
    case 'error':        return s.message;
  }
}
