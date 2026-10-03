import { describe, expect, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
// eslint-disable-next-line import/no-relative-packages
import { renderToString } from '../../solid/test/renderToString';
import { HydratedProbe, HydratingProbe } from './hydration.fixtures';

// Port note: the probes live in `hydration.fixtures.tsx` so they can be rendered on the server
// (see PORTING.md, "SSR and hydration tests").
describe('hydration', () => {
  describe('useIsHydrated', () => {
    const Probe = HydratedProbe;

    it('reports hydrated once mounted on the client', () => {
      render(() => <Probe />);

      expect(screen.getByTestId('hydrated')).toHaveTextContent('yes');
    });

    it('does not report hydrated while rendering on the server', async () => {
      await renderToString(Probe);

      expect(screen.getByTestId('hydrated')).toHaveTextContent('no');
    });
  });

  describe('useIsHydrating', () => {
    const Probe = HydratingProbe;

    it('does not report hydrating for a client-only mount', () => {
      render(() => <Probe />);

      expect(screen.getByTestId('hydrating')).toHaveTextContent('no');
    });

    it('reports hydrating while rendering on the server', async () => {
      await renderToString(Probe);

      expect(screen.getByTestId('hydrating')).toHaveTextContent('yes');
    });
  });

  // React-only: React 17's `useSyncExternalStore` shim and `useState` fallback have no Solid
  // counterpart.
  describe.skip('React 17 paths', () => {
    it.skip('never reports hydrated on the server', () => {});

    it.skip('reports hydrated once mounted on the client', () => {});

    it.skip('reports hydrating while rendering on the server', () => {});

    it.skip('stops reporting hydrating once mounted on the client', () => {});
  });
});
