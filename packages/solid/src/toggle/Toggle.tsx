import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { error } from '@base-ui-solid/utils/error';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useBaseUiId } from '../internals/useBaseUiId';
import { useRenderElement } from '../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../internals/types';
import { useToggleGroupContext } from '../toggle-group/ToggleGroupContext';
import { useButton } from '../internals/use-button/useButton';
import { CompositeItem } from '../internals/composite/item/CompositeItem';
import { createChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import { REASONS } from '../internals/reasons';
import type { ToolbarRoot } from '../toolbar/root/ToolbarRoot';

/**
 * A two-state button that can be on or off.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toggle](https://base-ui-solid.pages.dev/solid/components/toggle)
 */
export function Toggle<Value extends string>(componentProps: Toggle.Props<Value>): JSX.Element {
  const elementProps = omit(
    componentProps,
    'class',
    'defaultPressed',
    'disabled',
    'form', // never participates in form validation
    'onPressedChange',
    'pressed',
    'render',
    'type', // cannot change button type
    'value',
    'nativeButton',
    'style',
  );

  const generatedValue = useBaseUiId();
  // `|| undefined` handles cases, where value is falsy (i.e. "")
  const value = () => (componentProps.value || undefined) ?? generatedValue;
  const groupContext = useToggleGroupContext<string>();

  const disabled = () => ((componentProps.disabled ?? false) || groupContext?.disabled()) ?? false;

  if (IS_DEV) {
    useEffect(
      ([valueProp, isValueInitialized]) => {
        if (groupContext && valueProp === undefined && isValueInitialized) {
          error(
            'A `<Toggle>` component rendered in a `<ToggleGroup>` has no explicit `value` prop.',
            'This will cause issues between the Toggle Group and Toggle values.',
            'Provide the `<Toggle>` with a `value` prop matching the `<ToggleGroup>` values prop type.',
          );
        }
      },
      () => [componentProps.value, groupContext?.isValueInitialized()],
    );
  }

  const [pressed, setPressedState] = useControlled({
    controlled: () =>
      groupContext ? groupContext.value().indexOf(value()) > -1 : componentProps.pressed,
    // Port note: keep the default reactive for upstream's development warning; state initializes once.
    get default() {
      return componentProps.defaultPressed ?? false;
    },
    name: 'Toggle',
    state: 'pressed',
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: () => componentProps.nativeButton ?? true,
  });

  const state = createMemo<ToggleState>(() => ({
    disabled: disabled(),
    pressed: pressed(),
  }));

  const refs = [buttonRef];
  const props = (ownElementProps: object = elementProps) => [
    {
      'aria-pressed': pressed(),
      onClick(event: MouseEvent) {
        const nextPressed = !untrack(pressed);
        const details = createChangeEventDetails(REASONS.none, event);

        // `onPressedChange` runs before the group commits so that canceling here
        // can also veto the group value change, which shares this `details` object.
        componentProps.onPressedChange?.(nextPressed, details);

        if (details.isCanceled) {
          return;
        }

        const currentValue = untrack(value);
        if (currentValue) {
          groupContext?.setGroupValue?.(currentValue, nextPressed, details);
        }

        if (details.isCanceled) {
          return;
        }

        setPressedState(nextPressed);
      },
    },
    ownElementProps,
    getButtonProps,
  ];

  if (groupContext) {
    // A disabled toggle is natively disabled and cannot hold roving focus.
    // Toolbar reads this metadata to compute its `disabledIndices`.
    const itemMetadata = createMemo<ToolbarRoot.ItemMetadata>(() => ({
      disabled: disabled(),
      focusableWhenDisabled: false,
    }));

    // Port note: upstream composes the forwarded ref after the composite item's own ref (it's
    // part of `refs`), so an outer composite item rendering this toggle (e.g. `Toolbar.Button`
    // with a `render` function) registers last and its metadata wins. Solid forwards the ref
    // through `elementProps`, which attach first, so it's moved to `refs` here.
    const itemElementProps = omit(elementProps, 'ref');
    const forwardedRef = (element: HTMLButtonElement | null) => {
      if (element) {
        applyRef(
          untrack(() => componentProps.ref),
          element,
        );
      }
    };

    // eslint-disable-next-line solid/components-return-once -- `groupContext` never changes (mirrors upstream's early return)
    return (
      <CompositeItem
        tag="button"
        render={componentProps.render}
        class={componentProps.class}
        style={componentProps.style}
        metadata={itemMetadata()}
        state={state()}
        refs={[...refs, forwardedRef]}
        props={props(itemElementProps)}
      />
    );
  }

  return useRenderElement('button', componentProps, {
    state,
    ref: refs,
    props,
  });
}

function applyRef(ref: unknown, element: HTMLButtonElement) {
  if (Array.isArray(ref)) {
    ref.forEach((item) => applyRef(item, element));
  } else if (typeof ref === 'function') {
    ref(element);
  }
}

export interface ToggleState {
  /**
   * Whether the toggle is currently pressed.
   */
  pressed: boolean;
  /**
   * Whether the toggle should ignore user interaction.
   */
  disabled: boolean;
}

export interface ToggleProps<Value extends string>
  extends NativeButtonProps, Omit<BaseUIComponentProps<'button', ToggleState>, 'value'> {
  /**
   * Whether the toggle button is currently pressed.
   * This is the controlled counterpart of `defaultPressed`.
   */
  pressed?: boolean | undefined;
  /**
   * Whether the toggle button is currently pressed.
   * This is the uncontrolled counterpart of `pressed`.
   * @default false
   */
  defaultPressed?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Callback fired when the pressed state is changed.
   */
  onPressedChange?:
    ((pressed: boolean, eventDetails: Toggle.ChangeEventDetails) => void) | undefined;
  /**
   * A unique string that identifies the toggle when used
   * inside a toggle group.
   */
  value?: Value | undefined;
}

export type ToggleChangeEventReason = typeof REASONS.none;

export type ToggleChangeEventDetails = BaseUIChangeEventDetails<Toggle.ChangeEventReason>;

export namespace Toggle {
  export type State = ToggleState;
  export type Props<TValue extends string = string> = ToggleProps<TValue>;
  export type ChangeEventReason = ToggleChangeEventReason;
  export type ChangeEventDetails = ToggleChangeEventDetails;
}
