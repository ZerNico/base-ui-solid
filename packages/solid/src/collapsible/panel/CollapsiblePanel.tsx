import { Show, createMemo, merge, omit } from 'solid-js';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { warn } from '@base-ui-solid/utils/warn';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import type { BaseUIComponentProps } from '../../internals/types';
import { resolveStyle } from '../../utils/resolveStyle';
import { useRenderElement } from '../../internals/useRenderElement';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import type { CollapsibleRootState } from '../root/CollapsibleRoot';
import { collapsibleStateAttributesMapping } from '../root/stateAttributesMapping';
import { useCollapsiblePanel } from './useCollapsiblePanel';
import * as CollapsiblePanelCssVars from './CollapsiblePanelCssVars';
import type { TransitionStatus } from '../../internals/useTransitionStatus';

/**
 * A panel with the collapsible contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsiblePanel(componentProps: CollapsiblePanel.Props) {
  const elementProps = omit(
    componentProps,
    'class',
    'hiddenUntilFound',
    'keepMounted',
    'render',
    'id',
    'style',
  );

  if (IS_DEV) {
    useEffect(
      ([hiddenUntilFoundProp, keepMountedProp]) => {
        if (hiddenUntilFoundProp && keepMountedProp === false) {
          warn(
            'The `keepMounted={false}` prop on `Collapsible.Panel` is ignored when `hiddenUntilFound` is enabled, since the panel must remain mounted while closed.',
          );
        }
      },
      () => [componentProps.hiddenUntilFound, componentProps.keepMounted],
    );
  }

  const {
    defaultPanelId,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setPanelIdState,
    setOpen,
    state,
    transitionStatus,
  } = useCollapsibleRootContext();

  const hiddenUntilFound = () => componentProps.hiddenUntilFound ?? false;
  const keepMounted = () => componentProps.keepMounted ?? false;
  const registeredId = () => componentProps.id || undefined;
  const id = () => registeredId() ?? defaultPanelId;

  useIsoLayoutEffect(
    ([currentRegisteredId]) => {
      setPanelIdState((currentId) =>
        currentRegisteredId ?? (currentId === null ? undefined : currentId),
      );
      return () => {
        setPanelIdState((currentId) => (currentId === currentRegisteredId ? null : currentId));
      };
    },
    () => [registeredId()],
  );

  const panel = useCollapsiblePanel({
    hiddenUntilFound,
    id,
    keepMounted,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setOpen,
    transitionStatus,
  });

  const panelState = createMemo<CollapsiblePanelState>(() => ({
    ...state(),
    transitionStatus: panel.transitionStatus(),
  }));

  return (
    <Show when={panel.shouldRender()}>
      {useRenderElement('div', merge(componentProps, { style: undefined }), {
        state: panelState,
        ref: panel.ref,
        props: () => {
          const height = panel.height();
          const width = panel.width();
          const resolvedStyle = resolveStyle(componentProps.style, panelState());

          return [
            panel.props(),
            {
              style: {
                [CollapsiblePanelCssVars.collapsiblePanelHeight]:
                  height === undefined ? 'auto' : `${height}px`,
                [CollapsiblePanelCssVars.collapsiblePanelWidth]:
                  width === undefined ? 'auto' : `${width}px`,
              },
            },
            elementProps,
            resolvedStyle ? { style: resolvedStyle } : undefined,
            // Resolve the public `style` prop so temporary `animation-name: none`
            // can still win after user's inline styles have been merged.
            panel.shouldPreventOpenAnimation() ? { style: { 'animation-name': 'none' } } : undefined,
          ];
        },
        stateAttributesMapping: collapsibleStateAttributesMapping,
      })}
    </Show>
  );
}

export interface CollapsiblePanelState extends CollapsibleRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface CollapsiblePanelProps extends BaseUIComponentProps<'div', CollapsiblePanelState> {
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   *
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   *
   * @default false
   */
  hiddenUntilFound?: boolean | undefined;
  /**
   * Whether to keep the element in the DOM while the panel is hidden.
   * This prop is ignored when `hiddenUntilFound` is used.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace CollapsiblePanel {
  export type State = CollapsiblePanelState;
  export type Props = CollapsiblePanelProps;
}
