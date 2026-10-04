import { children as resolveChildren, createMemo, createSignal } from 'solid-js';
import type { Accessor, Setter } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useId } from '@base-ui-solid/utils/useId';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useToastRootContext } from '../root/ToastRootContext';
import { hasRenderableChildren, isRenderableNode } from './isRenderableNode';

/**
 * Shared logic for `Toast.Title` and `Toast.Description`, which only differ by the rendered tag,
 * the fallback content, and which id setter they register with. Resolves the content and returns
 * the pieces each part passes to `useRenderElement` and `useToastLabelElement`.
 *
 * Port note: takes the component props (read lazily) instead of `idProp` and `childrenProp`.
 * `id`, `type` and `children` are accessors; `children` resolves the content once (Solid creates
 * JSX children each time the `children` prop is read).
 */
export function useToastLabelPart(
  componentProps: { id?: unknown; children?: unknown },
  part: 'title' | 'description',
) {
  const { toast, setTitleId, setDescriptionId } = useToastRootContext();

  const setId = part === 'title' ? setTitleId : setDescriptionId;
  const children = resolveChildren(
    () =>
      (componentProps.children as JSX.Element) ??
      (part === 'title' ? toast().title : toast().description),
  );

  const generatedId = useId();
  const id = () => (componentProps.id as string | undefined) ?? generatedId;

  const type = () => toast().type;

  return { id, children, type, setId };
}

/**
 * Mounts the evaluated label element only when it carries renderable content (so a `render` prop's
 * own children count, while a childless styling-only `render` stays conditional), registering the
 * generated id with the root while the part renders.
 *
 * Port note: Solid renders the element once, so it's kept and inserted only while it has content.
 * When a `render` function or component renders it, the rendered DOM element is inspected (see
 * `hasRenderableChildren`); otherwise the resolved content decides, like upstream.
 */
export function useToastLabelElement(
  element: JSX.Element,
  content: Accessor<JSX.Element>,
  render: Accessor<unknown>,
  id: Accessor<string | undefined>,
  setId: Setter<string | undefined>,
): JSX.Element {
  const resolvedElement = resolveChildren(() => element);

  const shouldRender = useRenderableContent(resolvedElement, content, render);

  useIsoLayoutEffect(
    ([shouldRenderValue, idValue]) => {
      if (!shouldRenderValue) {
        return undefined;
      }

      setId(idValue);
      return () => {
        setId((currentId) => (currentId === idValue ? undefined : currentId));
      };
    },
    () => [shouldRender(), id()],
  );

  return createMemo(() => (shouldRender() ? resolvedElement() : null)) as unknown as JSX.Element;
}

/**
 * Port note: decides whether a rendered part has content (upstream's `hasRenderableChildren`).
 */
export function useRenderableContent(
  resolvedElement: Accessor<JSX.Element>,
  content: Accessor<JSX.Element>,
  render: Accessor<unknown>,
): Accessor<boolean> {
  // Port note: DOM children can update without changing the custom render's root identity.
  // Observe even detached roots so empty content can become visible again.
  const [revision, setRevision] = createSignal(0);
  useIsoLayoutEffect(
    ([node, renderValue]) => {
      if (typeof renderValue !== 'function' || typeof MutationObserver === 'undefined') {
        return undefined;
      }
      const observer = new MutationObserver(() => setRevision((value) => value + 1));
      const observe = (value: JSX.Element) => {
        if (Array.isArray(value)) {
          value.forEach(observe);
        } else if (typeof Node !== 'undefined' && value instanceof Node) {
          observer.observe(value, { childList: true, characterData: true, subtree: true });
        }
      };
      observe(node);
      setRevision((value) => value + 1);
      return () => observer.disconnect();
    },
    () => [resolvedElement(), render()],
  );
  return createMemo(() => {
    revision();
    const contentValue = content();
    const node = resolvedElement();
    if (typeof render() !== 'function') {
      return node != null && isRenderableNode(contentValue);
    }
    return hasRenderableChildren(node);
  });
}
