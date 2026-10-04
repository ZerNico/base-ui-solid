import { createContext, createMemo, createSignal, useContext } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';

interface ClosePartContextValue {
  register: () => () => void;
}

export const ClosePartContext = createContext<ClosePartContextValue | null>(null);

/**
 * Port note: `hasClosePart` is an accessor; `context` is stable.
 */
export function useClosePartCount() {
  const [closePartCount, setClosePartCount] = createSignal(0, { ownedWrite: true });

  const register = () => {
    setClosePartCount((count) => count + 1);

    return () => {
      setClosePartCount((count) => Math.max(0, count - 1));
    };
  };

  const context = { register };

  const hasClosePart = createMemo(() => closePartCount() > 0);

  return {
    context,
    hasClosePart,
  };
}

export function useClosePartRegistration() {
  const context = useContext(ClosePartContext) ?? undefined;

  useIsoLayoutEffect(
    ([contextValue]) => {
      return contextValue?.register();
    },
    () => [context],
  );
}
