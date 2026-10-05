import { Show, createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useRenderElement } from '../../internals/useRenderElement';
import { useAvatarRootContext } from '../root/AvatarRootContext';
import type { AvatarRootState, ImageLoadingStatus } from '../root/AvatarRoot';
import { avatarStateAttributesMapping } from '../root/stateAttributesMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useImageLoadingStatus } from './useImageLoadingStatus';

const stateAttributesMapping: StateAttributesMapping<AvatarImageState> = {
  ...avatarStateAttributesMapping,
  ...transitionStatusMapping,
};

/**
 * The image to be displayed in the avatar.
 * Renders an `<img>` element.
 *
 * Documentation: [Base UI Avatar](https://base-ui-solid.pages.dev/solid/components/avatar)
 */
export function AvatarImage(componentProps: AvatarImage.Props) {
  const elementProps = omit(
    componentProps,
    'class',
    'render',
    'onLoadingStatusChange',
    'keepMounted',
    'style',
    // Split out so they can be applied after every other prop. React 17 and 18 set attributes in
    // props order, and Safari and Firefox start fetching as soon as `src` lands, ignoring a
    // `loading` or `srcSet` that arrives after it. React 19 orders these itself.
    'sizes',
    'srcset',
    'src',
  );

  const keepMounted = () => componentProps.keepMounted ?? false;

  const { setImageLoadingStatus: setRootImageLoadingStatus } = useAvatarRootContext();
  const [imageLoadingStatus, setImageLoadingStatus] = useImageLoadingStatus(
    () => componentProps.src as string | undefined,
    componentProps,
    () => !keepMounted(),
  );

  const isVisible = () => imageLoadingStatus() === 'loaded';
  const { mounted, transitionStatus, setMounted } = useTransitionStatus(isVisible);

  let imageRef: HTMLImageElement | null = null;
  let initialCommit = true;

  // With `keepMounted`, the status comes from the rendered element itself, whose `load` event may
  // have already fired (cached images, or loads completed before hydration).
  useIsoLayoutEffect(
    ([isKeepMounted]) => {
      if (!isKeepMounted) {
        return;
      }

      const isInitialCommit = initialCommit;
      initialCommit = false;

      // Port note: a disconnected element was swapped out by the `render` function (see the ref
      // below), so it counts as no element.
      const image = imageRef?.isConnected ? imageRef : null;
      if (!image) {
        // The `render` element didn't forward the ref. Its own `load`/`error` events remain the
        // only source of truth, so don't overwrite the status they already reported.
        return;
      }

      if (!image.complete) {
        setImageLoadingStatus('loading');
        return;
      }

      const status = image.naturalWidth > 0 ? 'loaded' : 'error';
      setImageLoadingStatus(status);

      // An image that's already complete on the first commit was painted before hydration, so
      // mount it without going through `'starting'` to avoid replaying the enter animation.
      if (status === 'loaded' && isInitialCommit) {
        setMounted(true);
      }
    },
    () => [
      keepMounted(),
      componentProps.src,
      componentProps.srcset,
      componentProps.sizes,
      componentProps.crossorigin,
      componentProps.referrerpolicy,
      componentProps.render,
    ],
  );

  const renderedStatusProps = (): Record<string, any> | undefined =>
    keepMounted()
      ? {
          // Presence no longer implies the image loaded, so the not-loaded states need their own
          // styling hooks. Scoped to `keepMounted` so the default mode, where the element only
          // exists once loaded, doesn't pick them up while it animates out.
          'data-loading': imageLoadingStatus() === 'loading' ? '' : undefined,
          'data-error': imageLoadingStatus() === 'error' ? '' : undefined,
          // Until the image is displayable, the fallback owns the accessible name; without this
          // both would be exposed to assistive technology at once (including in server HTML).
          'aria-hidden': imageLoadingStatus() !== 'loaded' || undefined,
          onLoad(event: Event) {
            // Port note: Solid applies a new `src` synchronously, so Firefox can still deliver the
            // previous source's queued `load` event while the new source is loading. A real `load`
            // event always finds the element complete.
            const image = event.currentTarget as HTMLImageElement;
            if (!image.complete && image.currentSrc) {
              return;
            }
            setImageLoadingStatus('loaded');
          },
          onError() {
            setImageLoadingStatus('error');
          },
        }
      : undefined;

  const handleLoadingStatusChange = (status: ImageLoadingStatus) => {
    componentProps.onLoadingStatusChange?.(status);
    setRootImageLoadingStatus(status);
  };

  useIsoLayoutEffect(
    ([status]) => {
      if (status !== 'idle') {
        handleLoadingStatusChange(status);
      }
    },
    () => [imageLoadingStatus()],
  );

  useIsoLayoutEffect(
    () => {
      return () => setRootImageLoadingStatus('idle');
    },
    () => [],
  );

  useOpenChangeComplete({
    enabled: () => !isVisible(),
    open: isVisible,
    ref: () => imageRef,
    onComplete() {
      if (!untrack(isVisible)) {
        setMounted(false);
      }
    },
  });

  const state = createMemo<AvatarImageState>(() => ({
    imageLoadingStatus: imageLoadingStatus(),
    // The element never unmounts with `keepMounted`, so an exit transition would play and then
    // reverse itself once the status is cleared. `data-loading`/`data-error` cover that state.
    transitionStatus:
      keepMounted() && transitionStatus() === 'ending' ? undefined : transitionStatus(),
  }));

  const shouldRender = () => keepMounted() || mounted();

  const sourceProps = () => {
    const props: JSX.ImgHTMLAttributes<HTMLImageElement> = {};

    if (componentProps.sizes !== undefined) {
      props.sizes = componentProps.sizes;
    }
    if (componentProps.srcset !== undefined) {
      props.srcset = componentProps.srcset;
    }
    if (componentProps.src !== undefined) {
      props.src = componentProps.src;
    }
    return props;
  };

  return (
    <Show when={shouldRender()}>
      {useRenderElement('img', componentProps, {
        state,
        ref: (element: HTMLImageElement | null) => {
          // Port note: when the `render` function swaps the element, the previous element's `null`
          // call can arrive after the new element's ref, so only non-null elements are stored.
          if (element) {
            imageRef = element;
          }
        },
        props: () => [renderedStatusProps(), elementProps, sourceProps()],
        stateAttributesMapping,
      })}
    </Show>
  );
}

export interface AvatarImageState extends AvatarRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface AvatarImageProps extends BaseUIComponentProps<
  'img',
  AvatarImageState,
  JSX.ImgHTMLAttributes<HTMLImageElement>
> {
  /**
   * Callback fired when the loading status changes.
   */
  onLoadingStatusChange?: ((status: ImageLoadingStatus) => void) | undefined;
  /**
   * Whether the image element stays mounted and loads in place instead of being preloaded.
   * Supports `loading="lazy"` and optimized image components such as `next/image`.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace AvatarImage {
  export type State = AvatarImageState;
  export type Props = AvatarImageProps;
}
