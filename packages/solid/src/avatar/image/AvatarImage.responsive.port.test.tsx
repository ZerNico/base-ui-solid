import { createSignal, flush } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, flushMicrotasks, isJSDOM, render, screen, waitFor } from '#test-utils';
import { Avatar } from '..';

type MockImage = {
  complete: boolean;
  naturalWidth: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  referrerPolicy: string;
  crossOrigin: string | null;
  sizes: string;
  src: string;
  srcset: string;
};

function mockImageLoading({ completeOnSet = false, naturalWidth = 100 } = {}) {
  const OriginalImage = window.Image;
  const images: MockImage[] = [];

  window.Image = function MockImage() {
    let srcValue = '';
    let srcSetValue = '';
    const obj: MockImage = {
      complete: false,
      naturalWidth: 0,
      onload: null,
      onerror: null,
      referrerPolicy: '',
      crossOrigin: null,
      sizes: '',
      get src() {
        return srcValue;
      },
      set src(value: string) {
        srcValue = value;
        if (completeOnSet) {
          obj.complete = true;
          obj.naturalWidth = naturalWidth;
        }
      },
      get srcset() {
        return srcSetValue;
      },
      set srcset(value: string) {
        srcSetValue = value;
        if (completeOnSet) {
          obj.complete = true;
          obj.naturalWidth = naturalWidth;
        }
      },
    };
    images.push(obj);
    return obj;
  } as unknown as typeof window.Image;

  return {
    images,
    restore() {
      window.Image = OriginalImage;
    },
  };
}

describe('<Avatar.Image /> responsive source updates', () => {
  let restoreImage: () => void;

  function installImageMock(options?: Parameters<typeof mockImageLoading>[0]) {
    restoreImage();
    const imageMock = mockImageLoading(options);
    restoreImage = imageMock.restore;
    return imageMock;
  }

  beforeEach(() => {
    restoreImage = mockImageLoading({ completeOnSet: true }).restore;
  });

  afterEach(() => {
    restoreImage();
  });

  it.skipIf(!isJSDOM)(
    'preloader: a reactive srcset change probes the new candidate and ignores the old load',
    async () => {
      const imageMock = installImageMock();
      const statuses: string[] = [];
      const [srcset, setSrcset] = createSignal('avatar-1x.png 1x');
      const [sizes, setSizes] = createSignal('48px');

      await render(() => (
        <Avatar.Root>
          <Avatar.Image
            sizes={sizes()}
            srcset={srcset()}
            onLoadingStatusChange={(status) => statuses.push(status)}
          />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar.Root>
      ));

      expect(imageMock.images).toHaveLength(1);
      expect(imageMock.images[0].srcset).toBe('avatar-1x.png 1x');
      expect(imageMock.images[0].sizes).toBe('48px');
      expect(statuses).toEqual(['loading']);

      const staleProbe = imageMock.images[0];
      setSrcset('avatar-2x.png 2x');
      setSizes('96px');
      flush();

      expect(imageMock.images).toHaveLength(2);
      const liveProbe = imageMock.images[1];
      expect(liveProbe.srcset).toBe('avatar-2x.png 2x');
      expect(liveProbe.sizes).toBe('96px');

      staleProbe.onload?.();
      await flushMicrotasks();
      expect(statuses).toEqual(['loading']);

      liveProbe.onload?.();
      await flushMicrotasks();
      expect(statuses).toEqual(['loading', 'loaded']);
    },
  );

  it.skipIf(!isJSDOM)(
    'keepMounted: a reactive srcset change clears loaded and resolves from the new image',
    async () => {
      const statuses: string[] = [];
      const [srcset, setSrcset] = createSignal('avatar-1x.png 1x');

      await render(() => (
        <Avatar.Root>
          <Avatar.Image
            data-testid="image"
            keepMounted
            src="avatar.png"
            srcset={srcset()}
            onLoadingStatusChange={(status) => statuses.push(status)}
          />
          <Avatar.Fallback>JD</Avatar.Fallback>
        </Avatar.Root>
      ));

      fireEvent.load(screen.getByTestId('image'));
      await waitFor(() => {
        expect(screen.queryByText('JD')).toBe(null);
      });
      expect(statuses).toEqual(['loading', 'loaded']);

      setSrcset('avatar-2x.png 2x');
      flush();

      await waitFor(() => {
        expect(statuses.at(-1)).toBe('loading');
      });
      expect(screen.getByText('JD')).not.toBe(null);

      fireEvent.load(screen.getByTestId('image'));
      await waitFor(() => {
        expect(screen.queryByText('JD')).toBe(null);
      });
      expect(statuses).toEqual(['loading', 'loaded', 'loading', 'loaded']);
    },
  );
});
