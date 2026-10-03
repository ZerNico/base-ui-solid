import { createContext, useContext } from 'solid-js';

/**
 * Port note: the provider passes an object with getters, so reading `nonce` /
 * `disableStyleElements` in a tracking scope stays reactive. Don't destructure it outside one.
 */
export interface CSPContextValue {
  nonce?: string | undefined;
  disableStyleElements?: boolean | undefined;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const CSPContext = createContext<CSPContextValue | null>(null);

const DEFAULT_CSP_CONTEXT_VALUE: CSPContextValue = {
  disableStyleElements: false,
};

export function useCSPContext(): CSPContextValue {
  return useContext(CSPContext) ?? DEFAULT_CSP_CONTEXT_VALUE;
}
