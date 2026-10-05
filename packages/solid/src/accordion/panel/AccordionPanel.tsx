import { Show, createMemo, merge, omit } from 'solid-js';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { warn } from '@base-ui-solid/utils/warn';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps } from '../../internals/types';
import { resolveStyle } from '../../utils/resolveStyle';
import { useCollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import { useCollapsiblePanel } from '../../collapsible/panel/useCollapsiblePanel';
import { useAccordionRootContext } from '../root/AccordionRootContext';
import type { AccordionRoot } from '../root/AccordionRoot';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';
import * as AccordionPanelCssVars from './AccordionPanelCssVars';
import { useRenderElement } from '../../internals/useRenderElement';
import type { TransitionStatus } from '../../internals/useTransitionStatus';

/**
 * A collapsible panel with the accordion item contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui-solid.pages.dev/solid/components/accordion)
 */
export function AccordionPanel(componentProps: AccordionPanel.Props) {
  const elementProps = omit(
    componentProps,
    'class',
    'hiddenUntilFound',
    'keepMounted',
    'id',
    'render',
    'style',
  );

  const { hiddenUntilFound: contextHiddenUntilFound, keepMounted: contextKeepMounted } =
    useAccordionRootContext();

  const {
    defaultPanelId,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setOpen,
    setPanelIdState,
    transitionStatus,
  } = useCollapsibleRootContext();

  const hiddenUntilFound = () => componentProps.hiddenUntilFound ?? contextHiddenUntilFound();
  const keepMounted = () => componentProps.keepMounted ?? contextKeepMounted();
  const registeredId = () => componentProps.id || undefined;
  const id = () => {
    const idProp = componentProps.id;
    // `false` removes the attribute in Solid, so it counts as not provided.
    return idProp === undefined || idProp === false ? defaultPanelId : idProp;
  };

  if (IS_DEV) {
    useEffect(
      ([currentHiddenUntilFound, keepMountedProp]) => {
        if (keepMountedProp === false && currentHiddenUntilFound) {
          warn(
            'The `keepMounted={false}` prop on an `Accordion.Panel` is ignored when `hiddenUntilFound` is enabled on the panel or root, since the panel must remain mounted while closed.',
          );
        }
      },
      () => [hiddenUntilFound(), componentProps.keepMounted],
    );
  }

  useIsoLayoutEffect(
    ([currentRegisteredId]) => {
      setPanelIdState(
        (currentId) => currentRegisteredId ?? (currentId === null ? undefined : currentId),
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

  const { state, triggerId } = useAccordionItemContext();

  const panelState = createMemo<AccordionPanelState>(
    () => ({
      ...state(),
      transitionStatus: panel.transitionStatus(),
    }),
    { equals: fastObjectShallowCompare },
  );

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
              'aria-labelledby': triggerId(),
              role: 'region',
              style: {
                [AccordionPanelCssVars.accordionPanelHeight]:
                  height === undefined ? 'auto' : `${height}px`,
                [AccordionPanelCssVars.accordionPanelWidth]:
                  width === undefined ? 'auto' : `${width}px`,
              },
            },
            elementProps,
            resolvedStyle ? { style: resolvedStyle } : undefined,
            // Resolve the public `style` prop so temporary `animation-name: none`
            // can still win after user's inline styles have been merged.
            panel.shouldPreventOpenAnimation()
              ? { style: { 'animation-name': 'none' } }
              : undefined,
          ];
        },
        stateAttributesMapping: accordionStateAttributesMapping,
      })}
    </Show>
  );
}

export interface AccordionPanelState extends AccordionItemState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface AccordionPanelProps
  extends
    BaseUIComponentProps<'div', AccordionPanelState>,
    Pick<AccordionRoot.Props, 'hiddenUntilFound' | 'keepMounted'> {}

export namespace AccordionPanel {
  export type State = AccordionPanelState;
  export type Props = AccordionPanelProps;
}
