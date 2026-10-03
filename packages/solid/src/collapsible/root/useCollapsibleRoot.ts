import { type Accessor, type Setter, createSignal } from 'solid-js';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import type { CollapsibleRoot } from './CollapsibleRoot';

export function useCollapsibleRoot(
  parameters: UseCollapsibleRootParameters,
): UseCollapsibleRootReturnValue {
  const { open: openParam, defaultOpen = false, onOpenChange, disabled } = parameters;

  const [open, setOpen] = useControlled({
    controlled: openParam,
    default: defaultOpen,
    name: 'Collapsible',
    state: 'open',
  });

  const { mounted, setMounted, transitionStatus } = useTransitionStatus(open, true, true);

  const defaultPanelId = useBaseUiId();
  // `undefined` uses the initial generated fallback; `null` means the panel unmounted.
  const [registeredPanelId, setPanelIdState] = createSignal<string | null | undefined>();
  const panelId = () => {
    const registered = registeredPanelId();
    return registered === null ? undefined : (registered ?? defaultPanelId);
  };

  const handleTrigger = (event: MouseEvent | KeyboardEvent) => {
    const nextOpen = !open();
    const eventDetails = createChangeEventDetails(REASONS.triggerPress, event);

    onOpenChange(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setOpen(nextOpen);
  };

  return {
    defaultPanelId,
    disabled,
    handleTrigger,
    mounted,
    open,
    panelId,
    setMounted,
    setOpen,
    setPanelIdState,
    transitionStatus,
  };
}

export interface UseCollapsibleRootParameters {
  /**
   * Whether the collapsible panel is currently open.
   *
   * To render an uncontrolled collapsible, use the `defaultOpen` prop instead.
   */
  open: Accessor<boolean | undefined>;
  /**
   * Whether the collapsible panel is initially open.
   *
   * To render a controlled collapsible, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange: (open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled: Accessor<boolean>;
}

export interface UseCollapsibleRootReturnValue {
  defaultPanelId: string;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: Accessor<boolean>;
  handleTrigger: (event: MouseEvent | KeyboardEvent) => void;
  /**
   * Whether the collapsible panel is mounted for transition and hidden-state
   * purposes. This can be `false` while the element remains in the DOM when
   * `keepMounted` or `hiddenUntilFound` is enabled.
   */
  mounted: Accessor<boolean>;
  /**
   * Whether the collapsible panel is currently open.
   */
  open: Accessor<boolean>;
  panelId: Accessor<string | undefined>;
  setMounted: (nextMounted: boolean) => void;
  setOpen: (open: boolean) => void;
  setPanelIdState: Setter<string | null | undefined>;
  transitionStatus: Accessor<TransitionStatus>;
}

export interface UseCollapsibleRootState {}
