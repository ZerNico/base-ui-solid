import { createContext, useContext } from 'solid-js';
import type { Accessor, Setter } from 'solid-js';
import type { ImageLoadingStatus } from './AvatarRoot';

export interface AvatarRootContext {
  imageLoadingStatus: Accessor<ImageLoadingStatus>;
  setImageLoadingStatus: Setter<ImageLoadingStatus>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const AvatarRootContext = createContext<AvatarRootContext | null>(null);

export function useAvatarRootContext() {
  const context = useContext(AvatarRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: AvatarRootContext is missing. Avatar parts must be placed within <Avatar.Root>.',
    );
  }
  return context;
}
