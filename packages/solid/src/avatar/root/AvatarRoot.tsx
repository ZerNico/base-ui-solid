import { createMemo, createSignal, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { AvatarRootContext } from './AvatarRootContext';
import { avatarStateAttributesMapping } from './stateAttributesMapping';

/**
 * Displays a user's profile picture, initials, or fallback icon.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui-solid.pages.dev/solid/components/avatar)
 */
export function AvatarRoot(componentProps: AvatarRoot.Props) {
  const elementProps = omit(componentProps, 'class', 'render', 'style');

  const [imageLoadingStatus, setImageLoadingStatus] = createSignal<ImageLoadingStatus>('idle');

  const state = createMemo<AvatarRootState>(
    () => ({
      imageLoadingStatus: imageLoadingStatus(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const contextValue: AvatarRootContext = {
    imageLoadingStatus,
    setImageLoadingStatus,
  };

  return (
    <AvatarRootContext value={contextValue}>
      {useRenderElement('span', componentProps, {
        state,
        props: elementProps,
        stateAttributesMapping: avatarStateAttributesMapping,
      })}
    </AvatarRootContext>
  );
}

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AvatarRootState {
  /**
   * The image loading status.
   */
  imageLoadingStatus: ImageLoadingStatus;
}

export interface AvatarRootProps extends BaseUIComponentProps<'span', AvatarRootState> {}

export namespace AvatarRoot {
  export type State = AvatarRootState;
  export type Props = AvatarRootProps;
}
