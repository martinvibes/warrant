/**
 * Who the human is, for the whole console.
 *
 * The console has exactly one privileged actor: the owner, whose signature is
 * the only thing that can authorise or withdraw spending. Everything else on
 * the page is a public read. So this context holds a signer and nothing else —
 * no balances, no session, no token — because the owner's authority is their
 * signature, not a login.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearStoredKey,
  connectInjected,
  createLocalKey,
  decryptKey,
  encryptKey,
  hasInjectedWallet,
  loadStoredKey,
  localSigner,
  saveStoredKey,
  type OwnerSigner,
  type StoredKey,
} from './owner';
import { getHealth, type Health } from './api';

type OwnerState =
  | { kind: 'none' }
  /** A local key exists in this browser but its passphrase has not been given. */
  | { kind: 'locked'; stored: StoredKey }
  | { kind: 'ready'; signer: OwnerSigner };

interface OwnerCtx {
  state: OwnerState;
  /** Service facts the console needs before it can sign anything. */
  health: Health | null;
  healthError: string | null;
  network: string;
  assetDecimals: number;
  hasWallet: boolean;

  connectWallet(): Promise<void>;
  /** Generates a key in this browser and stores it encrypted. Returns it once, to show. */
  createKey(passphrase: string): Promise<{ address: string; privateKey: string }>;
  unlockKey(passphrase: string): Promise<void>;
  lock(): void;
  forget(): void;
}

const Ctx = createContext<OwnerCtx | null>(null);

export function OwnerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OwnerState>({ kind: 'none' });
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  // A stored key means a returning operator; show it locked rather than absent
  // so the console offers "unlock" instead of "create another".
  useEffect(() => {
    const stored = loadStoredKey();
    if (stored) setState({ kind: 'locked', stored });
  }, []);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const h = await getHealth();
        if (live) {
          setHealth(h);
          setHealthError(null);
        }
      } catch (err) {
        if (live) setHealthError((err as Error).message);
      }
    };
    load();
    const id = setInterval(load, 20_000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    const signer = await connectInjected();
    setState({ kind: 'ready', signer });
  }, []);

  const createKey = useCallback(async (passphrase: string) => {
    const key = createLocalKey();
    saveStoredKey(await encryptKey(key.address, key.privateKey, passphrase));
    setState({ kind: 'ready', signer: localSigner(key.privateKey) });
    return key;
  }, []);

  const unlockKey = useCallback(
    async (passphrase: string) => {
      const stored = state.kind === 'locked' ? state.stored : loadStoredKey();
      if (!stored) throw new Error('There is no stored key in this browser to unlock.');
      setState({ kind: 'ready', signer: localSigner(await decryptKey(stored, passphrase)) });
    },
    [state]
  );

  // Locking drops the in-memory key and keeps the encrypted blob. An injected
  // wallet has nothing to lock, so it returns to disconnected.
  const lock = useCallback(() => {
    const stored = loadStoredKey();
    setState(stored ? { kind: 'locked', stored } : { kind: 'none' });
  }, []);

  const forget = useCallback(() => {
    clearStoredKey();
    setState({ kind: 'none' });
  }, []);

  const value = useMemo<OwnerCtx>(
    () => ({
      state,
      health,
      healthError,
      network: health?.network ?? 'hedera:testnet',
      assetDecimals: health?.assetDecimals ?? 6,
      hasWallet: hasInjectedWallet(),
      connectWallet,
      createKey,
      unlockKey,
      lock,
      forget,
    }),
    [state, health, healthError, connectWallet, createKey, unlockKey, lock, forget]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOwner(): OwnerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOwner must be used inside an OwnerProvider.');
  return ctx;
}

/** The signer, or null when nobody has authorised this browser to sign. */
export function useSigner(): OwnerSigner | null {
  const { state } = useOwner();
  return state.kind === 'ready' ? state.signer : null;
}
