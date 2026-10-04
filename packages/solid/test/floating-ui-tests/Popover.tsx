import { createSignal, createUniqueId, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useTestInteractions } from '#test-utils';
import { getEmptyRootContext } from '../../src/floating-ui-solid/utils/getEmptyRootContext';
import type { Placement } from '../../src/floating-ui-solid/types';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloatingNodeId,
  useFloatingParentNodeId,
} from '../../src/floating-ui-solid';
import { useFloating } from './useFloating';
import { useHover } from './useHover';
import styles from './Popover.module.css';

/** @internal */
export function Main() {
  return (
    <>
      <h1 class={styles.Heading}>Popover</h1>
      <div class={styles.Container}>
        <Popover
          modal
          bubbles
          render={({ labelId, descriptionId, close }) => (
            <>
              <h2 id={labelId} class={styles.Title}>
                Title
              </h2>
              <p id={descriptionId} class={styles.Description}>
                Description
              </p>
              <Popover
                modal
                bubbles
                render={(nested) => (
                  <>
                    <h2 id={nested.labelId} class={styles.Title}>
                      Title
                    </h2>
                    <p id={nested.descriptionId} class={styles.Description}>
                      Description
                    </p>
                    <Popover
                      modal
                      bubbles={false}
                      render={(innermost) => (
                        <>
                          <h2 id={innermost.labelId} class={styles.Title}>
                            Title
                          </h2>
                          <p id={innermost.descriptionId} class={styles.Description}>
                            Description
                          </p>
                          <button
                            type="button"
                            onClick={innermost.close}
                            class={styles.CloseButton}
                          >
                            Close
                          </button>
                        </>
                      )}
                    >
                      {(referenceProps) => (
                        <button type="button" {...referenceProps()}>
                          My button
                        </button>
                      )}
                    </Popover>
                    <button type="button" onClick={nested.close} class={styles.CloseButton}>
                      Close
                    </button>
                  </>
                )}
              >
                {(referenceProps) => (
                  <button type="button" {...referenceProps()}>
                    My button
                  </button>
                )}
              </Popover>
              <button type="button" onClick={close} class={styles.CloseButton}>
                Close
              </button>
            </>
          )}
        >
          {(referenceProps) => (
            <button type="button" {...referenceProps()}>
              My button
            </button>
          )}
        </Popover>
      </div>
    </>
  );
}

/**
 * Port note: upstream clones its `children` element with the reference props. Solid can't clone
 * elements, so `children` is a function receiving an accessor of the reference props.
 */
interface Props {
  render: (data: { close: () => void; labelId: string; descriptionId: string }) => JSX.Element;
  placement?: Placement;
  modal?: boolean;
  children?: (referenceProps: () => Record<string, unknown>) => JSX.Element;
  bubbles?: boolean;
  hover?: boolean;
}

/** @internal */
function PopoverComponent(props: Props) {
  const [open, setOpen] = createSignal(false);

  const nodeId = useFloatingNodeId();
  const floating = useFloating({
    nodeId,
    get open() {
      return open();
    },
    get placement() {
      return props.placement;
    },
    onOpenChange: setOpen,
    middleware: [offset(10), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });
  const { refs, context } = floating;

  const id = createUniqueId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const triggerId = `${id}-trigger`;
  const fallbackContext = getEmptyRootContext();

  // Port note: the hover context is chosen once (upstream switches it on every render).
  const { getReferenceProps, getFloatingProps } = useTestInteractions([
    useHover(untrack(() => props.hover) ? context : fallbackContext, {
      handleClose: safePolygon({ blockPointerEvents: true }),
    }),
    useClick(context.rootStore),
    useDismiss(context.rootStore, {
      get bubbles() {
        return props.bubbles ?? true;
      },
    }),
  ]);

  return (
    <FloatingNode id={nodeId}>
      {props.children?.(() =>
        getReferenceProps({
          ref: refs.setReference,
          id: triggerId,
          'aria-haspopup': 'dialog',
          'aria-expanded': open() ? 'true' : 'false',
          'aria-controls': open() ? context.floatingId : undefined,
          'data-open': open() ? '' : undefined,
        } as Record<string, unknown>),
      )}
      <FloatingPortal>
        <Show when={open()}>
          <FloatingFocusManager context={context.rootStore} modal={props.modal ?? true}>
            <div
              class={styles.Floating}
              ref={refs.setFloating}
              style={floating.floatingStyles}
              id={context.floatingId}
              role="dialog"
              aria-labelledby={labelId}
              aria-describedby={descriptionId}
              {...getFloatingProps()}
            >
              {props.render({
                labelId,
                descriptionId,
                close: () => setOpen(false),
              })}
            </div>
          </FloatingFocusManager>
        </Show>
      </FloatingPortal>
    </FloatingNode>
  );
}

/** @internal */
export function Popover(props: Props) {
  const parentId = useFloatingParentNodeId();

  // This is a root, so we wrap it with the tree
  // Port note: decided once, like upstream, since context presence can't change.
  if (parentId === null) {
    // eslint-disable-next-line solid/components-return-once
    return (
      <FloatingTree>
        <PopoverComponent {...props} />
      </FloatingTree>
    );
  }

  return <PopoverComponent {...props} />;
}
