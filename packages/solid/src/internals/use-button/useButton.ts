import { createMemo, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { error } from '@base-ui-solid/utils/error';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { useIsoLayoutEffect, useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { makeEventPreventable } from '../../merge-props';
import { mergePropsSnapshot, omitProps } from '../../merge-props/mergeProps';
import { useCompositeRootContext } from '../composite/root/CompositeRootContext';
import type { BaseUIEvent } from '../types';
import { useFocusableWhenDisabled } from '../../utils/useFocusableWhenDisabled';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';

export function useButton(parameters: UseButtonParameters = {}): UseButtonReturnValue {
  const disabled = () => parameters.disabled?.() ?? false;
  const isNativeButton = () => parameters.native?.() ?? true;

  let element: HTMLElement | null = null;

  const compositeRootContext = useCompositeRootContext(true);
  const isCompositeItem = () => parameters.composite?.() ?? compositeRootContext !== undefined;

  const { props: focusableWhenDisabledProps } = useFocusableWhenDisabled({
    focusableWhenDisabled: parameters.focusableWhenDisabled,
    disabled,
    composite: isCompositeItem,
    tabIndex: parameters.tabIndex,
    isNativeButton,
  });

  if (IS_DEV) {
    useEffect(
      ([isNative]) => {
        if (!element) {
          return;
        }

        const isButtonTag = isButtonElement(element);

        if (isNative) {
          if (!isButtonTag) {
            error(
              'A component that acts as a button expected a native <button> because the ' +
                '`nativeButton` prop is true. Rendering a non-<button> removes native button ' +
                'semantics, which can impact forms and accessibility. Use a real <button> in the ' +
                '`render` prop, or set `nativeButton` to `false`.',
            );
          }
        } else if (isButtonTag) {
          error(
            'A component that acts as a button expected a non-<button> because the `nativeButton` ' +
              'prop is false. Rendering a <button> keeps native behavior while Base UI applies ' +
              'non-native attributes and handlers, which can add unintended extra attributes (such ' +
              'as `role` or `aria-disabled`). Use a non-<button> in the `render` prop, or set ' +
              '`nativeButton` to `true`.',
          );
        }
      },
      () => [isNativeButton()],
    );
  }

  // handles a disabled composite button rendering another button, e.g.
  // <Toolbar.Button disabled render={<Menu.Trigger />} />
  // the `disabled` prop needs to pass through 2 `useButton`s then finally
  // delete the `disabled` attribute from DOM
  const disabledUpdate = createMemo(
    () => ({
      disabled: disabled(),
      focusableDisabled: focusableWhenDisabledProps().disabled,
      isCompositeItem: isCompositeItem(),
    }),
    { equals: fastObjectShallowCompare },
  );

  function updateDisabled(values = untrack(disabledUpdate)) {
    if (!isButtonElement(element)) {
      return;
    }

    if (
      values.isCompositeItem &&
      values.disabled &&
      values.focusableDisabled === undefined &&
      element.disabled
    ) {
      element.disabled = false;
    }
  }

  useIsoLayoutEffect(
    ([values]) => updateDisabled(values),
    () => [disabledUpdate()],
  );

  const getButtonProps = (externalProps: GenericButtonProps = {}) => {
    const {
      onClick: externalOnClick,
      onMouseDown: externalOnMouseDown,
      onKeyUp: externalOnKeyUp,
      onKeyDown: externalOnKeyDown,
      onPointerDown: externalOnPointerDown,
    } = externalProps as Record<string, ((event: any) => void) | undefined>;
    // Not object rest destructuring: it would read (and create) `children`.
    const otherExternalProps = omitProps(externalProps, [
      'onClick',
      'onMouseDown',
      'onKeyUp',
      'onKeyDown',
      'onPointerDown',
    ]);

    const isDisabled = disabled();
    const isNative = isNativeButton();
    const isComposite = isCompositeItem();

    return mergePropsSnapshot<Record<string, any>>(
      {
        onClick(event: MouseEvent) {
          if (isDisabled) {
            event.preventDefault();
            return;
          }
          externalOnClick?.(event);
        },
        onMouseDown(event: MouseEvent) {
          if (!isDisabled) {
            externalOnMouseDown?.(event);
          }
        },
        onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
          if (isDisabled) {
            return;
          }

          makeEventPreventable(event);
          externalOnKeyDown?.(event);
          if (event.baseUIHandlerPrevented) {
            return;
          }

          const isCurrentTarget = event.target === event.currentTarget;
          const currentTarget = event.currentTarget as Element;
          const isButton = isButtonElement(currentTarget);
          const isLink = !isNative && isValidLinkElement(currentTarget);
          const shouldClick = isCurrentTarget && (isNative ? isButton : !isLink);
          const isEnterKey = event.key === 'Enter';
          const isSpaceKey = event.key === ' ';
          const role = currentTarget.getAttribute('role');
          const isTextNavigationRole =
            role?.startsWith('menuitem') || role === 'option' || role === 'gridcell';

          if (isCurrentTarget && isComposite && isSpaceKey) {
            if (event.defaultPrevented && isTextNavigationRole) {
              return;
            }

            event.preventDefault();

            // Only a native-mode item that isn't a real <button> is excluded.
            if (!isNative || isButton) {
              event.preventBaseUIHandler();
              dispatchClickWithModifiers(currentTarget, event);
            }

            return;
          }

          // Keyboard accessibility for native and non-native elements.
          if (!shouldClick || isNative || (!isSpaceKey && !isEnterKey)) {
            // Space activates links on keyup (`role="button"` semantics, matching the
            // composite path); prevent the page scroll Space would otherwise trigger.
            // Enter is left to the browser's native link activation.
            if (isCurrentTarget && isLink && isSpaceKey) {
              event.preventDefault();
            }
            return;
          }

          // Match native buttons: preventing the keydown's default cancels activation.
          if (event.defaultPrevented) {
            return;
          }

          event.preventDefault();

          if (isEnterKey) {
            event.preventBaseUIHandler();
            dispatchClickWithModifiers(currentTarget, event);
          }
        },
        onKeyUp(event: BaseUIEvent<KeyboardEvent>) {
          if (isDisabled) {
            return;
          }

          // calling preventDefault in keyUp on a <button> will not dispatch a click event if Space is pressed
          // https://codesandbox.io/p/sandbox/button-keyup-preventdefault-dn7f0
          makeEventPreventable(event);
          externalOnKeyUp?.(event);

          if (
            event.target === event.currentTarget &&
            isNative &&
            isComposite &&
            isButtonElement(event.currentTarget as HTMLElement) &&
            event.key === ' '
          ) {
            event.preventDefault();
            return;
          }

          if (event.baseUIHandlerPrevented) {
            return;
          }

          // Keyboard accessibility for non interactive elements.
          // Match native buttons: preventing the keyup's default cancels Space activation.
          // Limitation: unlike a native <button>, a prevented *keydown* cannot cancel the
          // activation — no state is kept between keydown and keyup, so we can't tell
          // whether the keydown was prevented or even happened on this element.
          if (
            event.target === event.currentTarget &&
            !isNative &&
            !isComposite &&
            !event.defaultPrevented &&
            event.key === ' '
          ) {
            event.preventBaseUIHandler();
            dispatchClickWithModifiers(event.currentTarget as Element, event);
          }
        },
        onPointerDown(event: PointerEvent) {
          if (isDisabled) {
            event.preventDefault();
            return;
          }
          externalOnPointerDown?.(event);
        },
      },
      isNative ? { type: 'button' } : { role: 'button' },
      focusableWhenDisabledProps(),
      otherExternalProps,
    );
  };

  const buttonRef = (nextElement: HTMLElement | null) => {
    element = nextElement;
    updateDisabled();
  };

  return {
    getButtonProps,
    buttonRef,
  };
}

function isButtonElement(elem: Element | null): elem is HTMLButtonElement {
  return isHTMLElement(elem) && elem.tagName === 'BUTTON';
}

function isValidLinkElement(elem: Element | null): elem is HTMLAnchorElement {
  return isHTMLElement(elem) && elem.tagName === 'A' && Boolean((elem as HTMLAnchorElement).href);
}

type GenericButtonProps = Record<string, any>;

export interface UseButtonParameters {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: Accessor<boolean | undefined> | undefined;
  /**
   * Whether the button may receive focus even if it is disabled.
   * @default false
   */
  focusableWhenDisabled?: Accessor<boolean | undefined> | undefined;
  tabIndex?: Accessor<number | undefined> | undefined;
  /**
   * Whether the component is being rendered as a native button.
   * @default true
   */
  native?: Accessor<boolean | undefined> | undefined;
  /**
   * Whether the button is part of a composite widget.
   * When `true`, keyboard activation for Space occurs on keydown rather than keyup.
   * @default inferred from CompositeRoot context
   */
  composite?: Accessor<boolean | undefined> | undefined;
}

export interface UseButtonReturnValue {
  /**
   * Resolver for the button props.
   * @param externalProps additional props for the button
   * @returns props that should be spread on the button
   */
  getButtonProps: (externalProps?: Record<string, any>) => Record<string, any>;
  /**
   * A ref callback for the button DOM element. It should be passed to the rendered element.
   * It is not a part of the props returned by `getButtonProps`.
   */
  buttonRef: (element: HTMLElement | null) => void;
}

export interface UseButtonState {}
