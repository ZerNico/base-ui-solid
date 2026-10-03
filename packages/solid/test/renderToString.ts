/* eslint-disable no-underscore-dangle */ // `__ssrSource` (set by the fixtures plugin) and Solid's `_$HY` hydration global
import * as Solid from 'solid-js';
import { createComponent, createStore, flush } from 'solid-js';
import type { Component } from 'solid-js';
import { hydrate as solidHydrate } from '@solidjs/web';
import { onTestFinished, vi } from 'vitest';
import { isJSDOM } from '@base-ui-solid/utils/testUtils';

interface SsrSource {
  moduleId: string;
  exportName: string;
}

async function renderOnServer(source: SsrSource, props: unknown) {
  if (isJSDOM) {
    // eslint-disable-next-line import/no-relative-packages
    const server = await import('../../../test/ssr/renderOnServer.mts');
    return server.renderOnServer(source.moduleId, source.exportName, props);
  }
  const { commands } = await import('vitest/browser');
  return (commands as any).renderOnServer(source.moduleId, source.exportName, props) as Promise<{
    html: string;
    hydrationScript: string;
  }>;
}

let hydrationWarnings: string[] = [];

function captureHydrationWarnings(callback: () => void) {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('Hydration')) {
      hydrationWarnings.push(args[0]);
    }
    originalWarn.apply(console, args);
  };
  try {
    callback();
  } finally {
    console.warn = originalWarn;
  }
}

function throwOnHydrationWarnings() {
  const warnings = hydrationWarnings;
  hydrationWarnings = [];
  if (warnings.length > 0) {
    throw new Error(`renderToString: hydration mismatch:\n${warnings.join('\n')}`);
  }
}

/**
 * Counterpart of upstream's `renderToString`: renders `Component` with Solid's server build, puts
 * the markup in the document, and returns `hydrate()` to hydrate it with the client build.
 *
 * Port note: `Component` must be exported from a `*.fixtures.tsx` module (see
 * `vitest.shared.mts`), and `props` must be serializable, since the server render runs in Node.
 */
export async function renderToString<P extends Record<string, any>>(
  Component: Component<P>,
  props: P = {} as P,
) {
  const source = (Component as unknown as { __ssrSource?: SsrSource }).__ssrSource;
  if (!source) {
    throw new Error(
      'renderToString: the component must be exported from a `*.fixtures.tsx` module.',
    );
  }

  const { html, hydrationScript } = await renderOnServer(source, props);

  // Each server render ships a fresh hydration bootstrap, like a new page load.
  delete (globalThis as { _$HY?: unknown })._$HY;
  // eslint-disable-next-line no-new-func
  new Function(hydrationScript)();

  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  let dispose: (() => void) | undefined;
  onTestFinished(async () => {
    if (dispose && !vi.isFakeTimers()) {
      // Let the deferred unclaimed-node check run before tearing down.
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
    }
    dispose?.();
    container.remove();
    delete (globalThis as { _$HY?: unknown })._$HY;
    throwOnHydrationWarnings();
  });

  return {
    container,
    html,
    /**
     * Hydrates the server markup with the client build.
     *
     * Solid reports hydration mismatches (missing hydration keys, tag/structure mismatches, and,
     * a macrotask after hydration, unclaimed server-rendered nodes) through `console.warn`. Like
     * upstream, where React's hydration errors fail the test, they fail the test here.
     */
    hydrate() {
      // Port note: a store, so `setProps` can update the hydrated tree like upstream's
      // `hydrate().setProps`.
      const [currentProps, setCurrentProps] = createStore({ ...props } as Record<string, any>);
      captureHydrationWarnings(() => {
        dispose = solidHydrate(() => createComponent(Component, currentProps as P), container);
        flush();
      });
      // `verifyHydration` runs in a `setTimeout` after hydration ends; capture its report too.
      // `sharedConfig` is exported at runtime but not part of the public types.
      const config = (Solid as unknown as { sharedConfig: { verifyHydration?: () => void } })
        .sharedConfig;
      const verify = config.verifyHydration;
      if (verify) {
        config.verifyHydration = () => captureHydrationWarnings(verify);
      }
      throwOnHydrationWarnings();
      return {
        /** Updates the hydrated component's props and flushes. */
        setProps(nextProps: Partial<P>) {
          setCurrentProps((draft) => {
            Object.assign(draft, nextProps);
          });
          flush();
        },
      };
    },
  };
}
