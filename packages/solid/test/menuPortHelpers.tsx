import { Portal } from '@solidjs/web';
import { createSignal, flush, merge, untrack, Errored } from 'solid-js';
import type { Component, Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { render as baseRender, flushMicrotasks } from './utils';
import { createRenderer as baseCreateRenderer } from './createRenderer';

// Port note: upstream's fragments and forwarded-ref test components are factory functions in Solid.
export function PortFragment(props: { children?: JSX.Element }) {
  return <>{props.children}</>;
}
export const PortStrictMode = PortFragment;
export function portRef<T>(current: T): { current: T };
export function portRef<T>(current: null): { current: T | null };
export function portRef<T>(): { current: T | null };
export function portRef<T>(current: T | null = null) {
  return { current };
}
export function portCallback<T>(callback: T, _deps?: unknown[]) {
  return callback;
}
export function portForwardRef<P, T>(
  component: (props: P, ref: (element: T) => void) => JSX.Element,
): Component<P & { ref?: (element: T) => void }> {
  return (props) => component(props, (element) => props.ref?.(element));
}

// Port note: preserve the mounted component while upstream tests call setProps.
export function createRenderer(
  options?: Parameters<typeof baseCreateRenderer>[0] & { strict?: boolean },
) {
  const { clock } = baseCreateRenderer(options);
  async function render(
    factory: (props: any) => JSX.Element,
    initialProps?: Accessor<Record<string, any>>,
    options?: { container?: HTMLElement },
  ) {
    const [overrides, setOverrides] = createSignal<Record<string, any>>({});
    const props = merge(initialProps ?? (() => ({})), overrides);
    // Port note: contain expected component errors so they reject render without halting Solid.
    let caught: unknown;
    const result = await baseRender(
      () => (
        <Errored
          fallback={(error) => {
            caught = untrack(error);
            return null;
          }}
        >
          {factory(props)}
        </Errored>
      ),
      options,
    );
    // Port note: React act drains positioning promise chains before render resolves.
    for (let pass = 0; pass < 30; pass += 1) {
      // Positioning advances through dependent microtasks.
      // eslint-disable-next-line no-await-in-loop
      await flushMicrotasks();
    }
    if (caught) {
      result.unmount();
      throw caught;
    }
    return {
      ...result,
      async setProps(next: Record<string, any>) {
        setOverrides((prev) => ({ ...prev, ...next }));
        flush();
      },
    };
  }
  return { render, clock };
}
export function useRefWithInit<T>(init: () => T) {
  return { current: untrack(init) };
}
// Port note: React version/owner-stack cases are marked React-only in their tests.
export const portReactMajor = 19;
export const SafeReact = { captureOwnerStack: (() => null) as () => string | null };
export function ignoreActWarnings() {}

export function portFlushSync(callback: () => void) {
  callback();
  flush();
}
export function portCreatePortal(child: JSX.Element, mount: HTMLElement) {
  return <Portal mount={mount}>{child}</Portal>;
}
