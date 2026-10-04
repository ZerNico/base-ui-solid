import { createContext, useContext } from 'solid-js';
import type { PreviewCardStore } from '../store/PreviewCardStore';

export type PreviewCardRootContext<Payload = unknown> = PreviewCardStore<Payload>;

export const PreviewCardRootContext = createContext<PreviewCardRootContext | null>(null);

export function usePreviewCardRootContext(optional?: false): PreviewCardRootContext;
export function usePreviewCardRootContext(optional: true): PreviewCardRootContext | undefined;
export function usePreviewCardRootContext(optional?: boolean) {
  const context = useContext(PreviewCardRootContext) ?? undefined;
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: PreviewCardRootContext is missing. PreviewCard parts must be placed within <PreviewCard.Root>.',
    );
  }

  return context;
}
