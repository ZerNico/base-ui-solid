import { type Accessor, createSignal } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useBaseUiId } from '../useBaseUiId';

export function useAriaLabelledBy(
  explicitAriaLabelledBy: Accessor<string | undefined>,
  labelId: Accessor<string | undefined>,
  labelSource: () => LabelSource | null | undefined,
  enableFallback: Accessor<boolean> = () => true,
  labelSourceId?: Accessor<string | undefined>,
  ariaLabel?: Accessor<string | undefined>,
): Accessor<string | undefined> {
  const [fallbackAriaLabelledBy, setFallbackAriaLabelledBy] = createSignal<string | undefined>();

  // Port note: upstream derives the generated id from `labelSourceId` on every render; it is read
  // once here.
  const generatedId = useBaseUiId();
  const generatedLabelId = () => {
    const sourceId = labelSourceId?.();
    return sourceId ? `${sourceId}-label` : generatedId;
  };
  // A non-blank `aria-label` wins over any associated label, as it does on native inputs.
  const hasAriaLabel = () => Boolean(ariaLabel?.()?.trim());

  // Fallback for <span> controls labelled by wrapping/sibling native <label>.
  // Port note: upstream re-checks after every commit so DOM association changes (e.g. a label
  // mounting or unmounting) are picked up even when props/state are unchanged. Solid has no
  // commits, so this re-checks when an input changes and, while the fallback is active, when the
  // DOM around the control changes: a MutationObserver on the control's root node watches for
  // added/removed elements and `for`/`id` changes. Records are delivered in one batch per
  // microtask, and the observer is disconnected when the fallback is disabled or on cleanup.
  useIsoLayoutEffect(
    ([explicit, currentLabelId, currentHasAriaLabel, fallbackEnabled, currentGeneratedLabelId]) => {
      if (explicit || currentLabelId || currentHasAriaLabel || !fallbackEnabled) {
        setFallbackAriaLabelledBy(undefined);
        return undefined;
      }

      const update = () => {
        setFallbackAriaLabelledBy(getAriaLabelledBy(labelSource(), currentGeneratedLabelId));
      };
      update();

      const source = labelSource();
      if (!source || typeof MutationObserver === 'undefined') {
        return undefined;
      }

      const observer = new MutationObserver((records) => {
        if (records.some((record) => isRelevantMutation(record, source))) {
          update();
        }
      });
      observer.observe(source.getRootNode(), {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['for', 'id'],
      });
      return () => {
        observer.disconnect();
      };
    },
    () => [
      explicitAriaLabelledBy(),
      labelId(),
      hasAriaLabel(),
      enableFallback(),
      generatedLabelId(),
    ],
  );

  return () => {
    const implicitLabelId = hasAriaLabel() ? undefined : labelId();
    return explicitAriaLabelledBy() ?? implicitLabelId ?? fallbackAriaLabelledBy();
  };
}

/**
 * Whether a mutation can change the label associated with `source`: an element was added or
 * removed (a label, or a subtree containing one), or `for`/`id` changed on a label or the control.
 */
function isRelevantMutation(record: MutationRecord, source: Element) {
  if (record.type === 'attributes') {
    return record.target === source || (record.target as Element).tagName === 'LABEL';
  }
  return (
    Array.prototype.some.call(record.addedNodes, isElement) ||
    Array.prototype.some.call(record.removedNodes, isElement)
  );
}

function isElement(node: Node) {
  return node.nodeType === 1;
}

function getAriaLabelledBy(labelSource?: LabelSource | null, generatedLabelId?: string) {
  const label = findAssociatedLabel(labelSource);
  if (!label) {
    return undefined;
  }

  if (!label.id && generatedLabelId) {
    label.id = generatedLabelId;
  }

  return label.id || undefined;
}

function findAssociatedLabel(labelSource?: LabelSource | null) {
  if (!labelSource) {
    return undefined;
  }

  // Fast path before the expensive `.labels` read.
  const parent = labelSource.parentElement;
  if (parent && parent.tagName === 'LABEL') {
    return parent as HTMLLabelElement;
  }

  const controlId = labelSource.id;
  if (controlId) {
    const nextSibling = labelSource.nextElementSibling as HTMLLabelElement | null;
    if (nextSibling && nextSibling.htmlFor === controlId) {
      return nextSibling;
    }
  }

  const labels = labelSource.labels;
  return labels && labels[0];
}

type LabelSource = HTMLElement & { labels?: NodeListOf<HTMLLabelElement> | null | undefined };
