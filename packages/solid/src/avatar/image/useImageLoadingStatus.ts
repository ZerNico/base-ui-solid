import { type Accessor, type Setter, createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { NOOP } from '../../internals/noop';
import type { ImageLoadingStatus } from '../root/AvatarRoot';

// Port note: lowercase attribute names (Solid), read lazily from the options object.
interface UseImageLoadingStatusOptions {
  referrerpolicy?: JSX.ImgHTMLAttributes<HTMLImageElement>['referrerpolicy'] | undefined;
  crossorigin?: JSX.ImgHTMLAttributes<HTMLImageElement>['crossorigin'] | undefined;
  sizes?: JSX.ImgHTMLAttributes<HTMLImageElement>['sizes'] | undefined;
  srcset?: JSX.ImgHTMLAttributes<HTMLImageElement>['srcset'] | undefined;
}

export function useImageLoadingStatus(
  src: Accessor<string | undefined>,
  options: UseImageLoadingStatusOptions,
  enabled: Accessor<boolean>,
): [Accessor<ImageLoadingStatus>, Setter<ImageLoadingStatus>] {
  const state = createSignal<ImageLoadingStatus>('idle');
  const setLoadingStatus = state[1];

  useIsoLayoutEffect(
    ([isEnabled, currentSrc, srcSet, sizes, crossOrigin, referrerPolicy]) => {
      if (!isEnabled) {
        return NOOP;
      }

      if (!currentSrc && !srcSet) {
        setLoadingStatus('error');
        return NOOP;
      }

      let isMounted = true;
      const image = new window.Image();

      const updateStatus = (status: ImageLoadingStatus) => () => {
        if (!isMounted) {
          return;
        }

        setLoadingStatus(status);
      };

      setLoadingStatus('loading');
      image.onload = updateStatus('loaded');
      image.onerror = updateStatus('error');
      if (referrerPolicy) {
        image.referrerPolicy = referrerPolicy as string;
      }
      image.crossOrigin = (crossOrigin as string | undefined) ?? null;
      if (sizes) {
        image.sizes = sizes as string;
      }
      if (srcSet) {
        image.srcset = srcSet as string;
      }
      if (currentSrc) {
        image.src = currentSrc;
      }

      // Fast path for cached/decoded images
      if (image.complete) {
        setLoadingStatus(image.naturalWidth > 0 ? 'loaded' : 'error');
      }

      return () => {
        isMounted = false;
      };
    },
    () => [
      enabled(),
      src(),
      options.srcset,
      options.sizes,
      options.crossorigin,
      options.referrerpolicy,
    ],
  );

  return state;
}
