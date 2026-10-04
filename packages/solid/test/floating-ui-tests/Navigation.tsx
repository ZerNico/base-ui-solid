import { createSignal, omit, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { useTestInteractions } from '#test-utils';
import { getEmptyRootContext } from '../../src/floating-ui-solid/utils/getEmptyRootContext';
import type { HTMLProps } from '../../src/internals/types';
import {
  flip,
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  offset,
  safePolygon,
  shift,
  useDismiss,
  useFloatingNodeId,
  useFocus,
} from '../../src/floating-ui-solid';
import { useFloating } from './useFloating';
import { useHover } from './useHover';
import styles from './Navigation.module.css';

interface SubItemProps {
  label: string;
  href: string;
}

/** @internal */
export function NavigationSubItem(
  componentProps: SubItemProps & JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
) {
  const props = omit(componentProps, 'label', 'href');
  // Port note: the `ref` is forwarded with the other props.
  return (
    <a {...props} href={componentProps.href} class={styles.SubItem}>
      {componentProps.label}
    </a>
  );
}

interface ItemProps {
  label: string;
  href: string;
  children?: JSX.Element;
}

/** @internal */
export function NavigationItem(
  componentProps: ItemProps & JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
) {
  const props = omit(componentProps, 'children', 'label', 'href', 'ref');
  const [open, setOpen] = createSignal(false, { ownedWrite: true });
  // Port note: checks for the `children` prop without creating the children.
  const hasChildren = 'children' in componentProps;
  const fallbackContext = getEmptyRootContext();

  const nodeId = useFloatingNodeId();

  // Port note: `floatingStyles` is a getter, so the return value isn't destructured.
  const floating = useFloating({
    get open() {
      return open();
    },
    nodeId,
    onOpenChange: setOpen,
    middleware: [offset(8), flip(), shift()],
    placement: 'right-start',
  });
  const { refs, context } = floating;

  const { getReferenceProps, getFloatingProps } = useTestInteractions([
    useHover(hasChildren ? context : fallbackContext, {
      handleClose: safePolygon(),
    }),
    useFocus(context.rootStore, {
      enabled: hasChildren,
    }),
    useDismiss(context.rootStore, {
      enabled: hasChildren,
    }),
  ]);

  const mergedReferenceRef = useMergedRefs<HTMLAnchorElement>(
    () => componentProps.ref as any,
    () => refs.setReference,
  );

  return (
    <FloatingNode id={nodeId}>
      <li>
        <a
          href={componentProps.href}
          ref={mergedReferenceRef}
          class={styles.Item}
          {...getReferenceProps(props as HTMLProps<Element>)}
        >
          {componentProps.label}
        </a>
      </li>
      <FloatingPortal>
        <Show when={open()}>
          <FloatingFocusManager context={context.rootStore} modal={false} initialFocus={false}>
            <div
              data-testid="subnavigation"
              ref={refs.setFloating}
              class={styles.Subnav}
              style={floating.floatingStyles}
              {...getFloatingProps()}
            >
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
              <ul class={styles.SubnavList}>{componentProps.children}</ul>
            </div>
          </FloatingFocusManager>
        </Show>
      </FloatingPortal>
    </FloatingNode>
  );
}

interface NavigationProps {
  children?: JSX.Element;
}

/** @internal */
export function Navigation(props: NavigationProps) {
  return (
    <nav>
      <ul>{props.children}</ul>
    </nav>
  );
}

/** @internal */
export function Main() {
  return (
    <>
      <h1 class={styles.Heading}>Navigation</h1>
      <div class={styles.Container}>
        <Navigation>
          <NavigationItem label="Home" href="#" />
          <NavigationItem label="Product" href="#">
            <NavigationSubItem label="Link 1" href="#" />
            <NavigationSubItem label="Link 2" href="#" />
            <NavigationSubItem label="Link 3" href="#" />
          </NavigationItem>
          <NavigationItem label="About" href="#" />
        </Navigation>
      </div>
    </>
  );
}
