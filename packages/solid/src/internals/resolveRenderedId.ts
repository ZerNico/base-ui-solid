import { createSignal } from 'solid-js';
import type { Accessor } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';

interface ResolveRenderedIdProps {
  id?: string | undefined;
  render?: unknown;
}

/**
 * Resolves an element's id using the same precedence as `useRenderElement`.
 * Returns `''` when the element renders with an explicitly empty id, which consumers must treat
 * as "no id" rather than falling back to the generated one, so ARIA relationships never reference
 * an id no element carries. Render callbacks are opaque and are expected to use the id passed to
 * them.
 *
 * Port note: upstream first checks for an `id` on a `render` element (unwrapping server-created
 * `React.lazy` wrappers). Solid doesn't support element `render` props (only functions,
 * components and tag names, which are opaque), so only the `id` prop is read.
 *
 * @internal
 */
export function resolveRenderedId(props: ResolveRenderedIdProps, fallbackId: string | undefined) {
  return props.id ?? fallbackId;
}

/**
 * Resolves the element's id and returns a ref that publishes it to the owner while mounted.
 * A generated fallback is never published as an override, so removing an explicit id lets the
 * element return to the generated one.
 *
 * Port note: `props` is read lazily (pass the component props or an object with getters),
 * `defaultId` is an accessor and the returned id is an accessor. React re-attaches the callback
 * ref when the registered id changes (calling it with `null` first); Solid calls refs once, so
 * the id is published from an effect whose cleanup clears it before the next run and when the
 * owner is disposed.
 *
 * @internal
 */
export function useRenderedId(
  props: ResolveRenderedIdProps,
  defaultId: Accessor<string | undefined>,
  setId: ((id: string | undefined) => void) | undefined,
) {
  const id = () => resolveRenderedId(props, defaultId());
  const registeredId = () => {
    const resolvedId = id();
    return resolvedId === defaultId() ? undefined : resolvedId;
  };

  const [element, setElement] = createSignal<HTMLElement | null>(null, { ownedWrite: true });

  useIsoLayoutEffect(
    ([currentElement, currentRegisteredId]) => {
      if (!currentElement) {
        return undefined;
      }
      // Port note: Solid render callbacks are opaque before mount. Read their actual DOM
      // id after attributes commit, preserving explicit empty ids and callback overrides.
      const renderedId = currentElement.getAttribute('id');
      setId?.(renderedId === defaultId() ? undefined : (renderedId ?? currentRegisteredId));
      return () => {
        setId?.(undefined);
      };
    },
    () => [element(), registeredId()] as const,
  );

  const ref = (node: HTMLElement | null) => {
    setElement(node);
  };

  return [id, ref] as const;
}
