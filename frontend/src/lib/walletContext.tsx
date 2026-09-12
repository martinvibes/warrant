import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  loadStoredWallet,
  saveStoredWallet,
  clearStoredWallet,
  encryptWallet,
  decryptWallet,
  createWallet,
  getBalance,
  type GeneratedWallet,
  type StoredWallet,
} from './wallet';

type WalletState =
  | { kind: 'none' }
  | { kind: 'locked'; stored: StoredWallet }
  | { kind: 'unlocked'; wallet: GeneratedWallet };

interface WalletCtx {
  state: WalletState;
  balance: { wei: string; zg: string } | null;
  refreshBalance: () => Promise<void>;

  /** Generate a new wallet locally and persist encrypted in localStorage. */
  create(name: string | undefined, passphrase: string): Promise<GeneratedWallet>;
  /** Unlock the stored wallet using passphrase. */
  unlock(passphrase: string): Promise<void>;
  /** Lock the wallet (zero out in-memory key, keep encrypted blob). */
  lock(): void;
  /** Wipe the wallet from localStorage. */
  forget(): void;
}

const Ctx = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({ kind: 'none' });
  const [balance, setBalance] = useState<{ wei: string; zg: string } | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadStoredWallet();
    if (stored) setState({ kind: 'locked', stored });
  }, []);

  const refreshBalance = async () => {
    if (state.kind === 'unlocked') {
      try { setBalance(await getBalance(state.wallet.address)); } catch {}
    } else if (state.kind === 'locked') {
      try { setBalance(await getBalance(state.stored.address)); } catch {}
    }
  };

  // Refresh balance whenever wallet state changes; poll while unlocked.
  useEffect(() => {
    if (state.kind === 'none') { setBalance(null); return; }
    refreshBalance();
    const id = setInterval(refreshBalance, 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, state.kind === 'unlocked' ? state.wallet.address : state.kind === 'locked' ? state.stored.address : '']);

  const create = async (name: string | undefined, passphrase: string) => {
    if (!passphrase || passphrase.length < 8) {
      throw new Error('Passphrase must be at least 8 characters');
    }
    const wallet = createWallet(name);
    const stored = await encryptWallet(wallet, passphrase);
    saveStoredWallet(stored);
    setState({ kind: 'unlocked', wallet });
    return wallet;
  };

  const unlock = async (passphrase: string) => {
    if (state.kind !== 'locked') throw new Error('No locked wallet to unlock');
    const wallet = await decryptWallet(state.stored, passphrase);
    setState({ kind: 'unlocked', wallet });
  };

  const lock = () => {
    if (state.kind === 'unlocked') {
      const stored = loadStoredWallet();
      if (stored) setState({ kind: 'locked', stored });
      else setState({ kind: 'none' });
    }
  };

  const forget = () => {
    clearStoredWallet();
    setState({ kind: 'none' });
    setBalance(null);
  };

  return (
    <Ctx.Provider value={{ state, balance, refreshBalance, create, unlock, lock, forget }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet(): WalletCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
