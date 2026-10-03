import { type Accessor, createMemo } from 'solid-js';

export function useFocusableWhenDisabled(
  parameters: UseFocusableWhenDisabledParameters,
): UseFocusableWhenDisabledReturnValue {
  // we can't explicitly assign `undefined` to any of these props because it
  // would otherwise prevent subsequently merged props from setting them
  const props = createMemo(() => {
    const focusableWhenDisabled = parameters.focusableWhenDisabled?.();
    const disabled = parameters.disabled();
    const composite = parameters.composite?.() ?? false;
    const tabIndexProp = parameters.tabIndex?.() ?? 0;
    const isNativeButton = parameters.isNativeButton();

    const isFocusableComposite = composite && focusableWhenDisabled !== false;
    const isNonFocusableComposite = composite && focusableWhenDisabled === false;

    const additionalProps = {
      // allow Tabbing away from focusableWhenDisabled elements
      onKeyDown(event: KeyboardEvent) {
        if (disabled && focusableWhenDisabled && event.key !== 'Tab') {
          event.preventDefault();
        }
      },
    } as FocusableWhenDisabledProps;

    if (!composite) {
      additionalProps.tabindex = tabIndexProp;

      if (!isNativeButton && disabled) {
        additionalProps.tabindex = focusableWhenDisabled ? tabIndexProp : -1;
      }
    }

    if (
      (isNativeButton && (focusableWhenDisabled || isFocusableComposite)) ||
      (!isNativeButton && disabled)
    ) {
      additionalProps['aria-disabled'] = disabled;
    }

    if (isNativeButton && (!focusableWhenDisabled || isNonFocusableComposite)) {
      additionalProps.disabled = disabled;
    }

    return additionalProps;
  });

  return { props };
}

interface FocusableWhenDisabledProps {
  'aria-disabled'?: boolean | undefined;
  disabled?: boolean | undefined;
  onKeyDown: (event: KeyboardEvent) => void;
  tabindex: number;
}

export interface UseFocusableWhenDisabledParameters {
  /**
   * Whether the component should be focusable when disabled.
   * When `undefined`, composite items are focusable when disabled by default.
   */
  focusableWhenDisabled?: Accessor<boolean | undefined> | undefined;
  /**
   * The disabled state of the component.
   */
  disabled: Accessor<boolean>;
  /**
   * Whether this is a composite item or not.
   * @default false
   */
  composite?: Accessor<boolean | undefined> | undefined;
  /**
   * @default 0
   */
  tabIndex?: Accessor<number | undefined> | undefined;
  /**
   * @default true
   */
  isNativeButton: Accessor<boolean>;
}

export interface UseFocusableWhenDisabledReturnValue {
  props: Accessor<FocusableWhenDisabledProps>;
}

export interface UseFocusableWhenDisabledState {}
