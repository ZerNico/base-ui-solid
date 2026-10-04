import type { Accessor } from 'solid-js';
import { platform } from '@base-ui-solid/utils/platform';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';

// Word Joiner is invisible and zero-width, so it forces a text mutation without shifting layout.
const LIVE_REGION_MARKER = '⁠';
// Safari VoiceOver needed roughly 200ms to reliably notice the initial polite live-region change.
export const INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY = 200;

function findLastTextNode(root: HTMLElement): Text | null {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let lastTextNode: Text | null = null;

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    if (textNode.nodeValue !== '') {
      lastTextNode = textNode;
    }
  }

  return lastTextNode;
}

/**
 * A ref callback that also exposes the attached element as `current`, like a React ref object.
 */
export type LiveRegionRef<T> = ((element: T | null) => void) & RefObject<T | null>;

/**
 * @param present Whether the live region element is currently rendered. Lets a conditionally
 * rendered region re-run the marker each time its element (re)appears with text.
 *
 * Port note: `present` is an accessor, and the returned ref is a ref callback that exposes the
 * element as `current`.
 */
export function useInitialLiveRegionTextMutation<T extends HTMLElement>(
  present: Accessor<boolean> = () => true,
): LiveRegionRef<T> {
  const timeout = useTimeout();
  const rootRef = ((element: T | null) => {
    rootRef.current = element;
  }) as LiveRegionRef<T>;
  rootRef.current = null;

  // Only the initial mounted announcement needs the marker; later text updates announce naturally.
  useEffect(
    ([isPresent]) => {
      if (!isPresent || platform.os.ios) {
        return undefined;
      }

      const root = rootRef.current;
      if (root == null) {
        return undefined;
      }

      const textNode = findLastTextNode(root);
      if (textNode == null) {
        return undefined;
      }

      const originalValue = textNode.data;
      const markedValue = `${originalValue}${LIVE_REGION_MARKER}`;
      textNode.nodeValue = markedValue;

      timeout.start(INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY, () => {
        if (textNode.nodeValue === markedValue) {
          textNode.nodeValue = originalValue;
        }
      });

      return () => {
        timeout.clear();

        if (textNode.nodeValue === markedValue) {
          textNode.nodeValue = originalValue;
        }
      };
    },
    () => [present(), rootRef, timeout] as const,
  );

  return rootRef;
}
