import { createMemo, createSignal, flush, For, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui-solid/utils/visuallyHidden';
import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { useOnFirstRender } from '@base-ui-solid/utils/useOnFirstRender';
import { usePreviousValue } from '@base-ui-solid/utils/usePreviousValue';
import { isElementDisabled } from '@base-ui-solid/utils/isElementDisabled';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useValueAsRef } from '@base-ui-solid/utils/useValueAsRef';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { useClick } from '../../utils/popups/interactions/useClick';
import { useDismiss } from '../../utils/popups/interactions/useDismiss';
import { useListNavigation } from '../../utils/popups/interactions/useListNavigation';
import { useTypeahead } from '../../utils/popups/interactions/useTypeahead';
import { SelectRootContext } from './SelectRootContext';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { useRenderElement } from '../../internals/useRenderElement';
import { SelectStore, selectors } from '../store';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { FOCUSABLE_POPUP_PROPS } from '../../utils/popups/popupStoreUtils';
import { useFormContext } from '../../internals/form-context/FormContext';
import { stringifyAsLabel, stringifyAsValue } from '../../internals/resolveValueLabel';
import type { Group } from '../../internals/resolveValueLabel';
import {
  defaultItemEquality,
  findSelectionIndex,
  isSelectedValueDirty,
} from '../../internals/itemEquality';
import { useValueChanged } from '../../internals/useValueChanged';
import { useOpenInteractionType } from '../../utils/popups/interactions/useOpenInteractionType';
import { getMaxScrollOffset, normalizeScrollOffset } from '../../utils/scrollEdges';
import type { HTMLProps } from '../../internals/types';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import { NOOP } from '../../internals/noop';
import { getHiddenInputType } from '../../internals/getHiddenInputType';
import { useFieldDirtySource } from '../../internals/field-root-context/useFieldDirtySource';
import { useSingleAnchorPopupRoot } from '../../utils/popups/popupRoot';
import { createInitialPopupStoreState, createPopupStoreContext } from '../../utils/popups/store';

/**
 * Groups all parts of the select.
 * Doesn't render its own HTML element.
 *
 * Port note: the type parameters are `<ItemValue, Multiple, Value = ItemValue>` (upstream:
 * `<Value, Multiple>`), so the value type defaults to the type of the `items`' values when neither
 * `value` nor `defaultValue` determines it. `Select.Root<string>` still sets the value type.
 *
 * Documentation: [Base UI Select](https://base-ui-solid.pages.dev/solid/components/select)
 */
export function SelectRoot<
  ItemValue,
  Multiple extends boolean | undefined = false,
  Value = ItemValue,
>(props: SelectRoot.Props<Value, Multiple, ItemValue>): JSX.Element {
  const defaultValue = untrack(() => props.defaultValue) ?? null;
  const disabledProp = () => props.disabled ?? false;
  const readOnly = () => props.readOnly ?? false;
  const required = () => props.required ?? false;
  const modal = () => props.modal ?? true;
  const multiple = () => (props.multiple ?? false) as boolean;
  const isItemEqualToValue = () =>
    (props.isItemEqualToValue ?? defaultItemEquality) as (
      itemValue: any,
      selectedValue: any,
    ) => boolean;
  const highlightItemOnHover = () => props.highlightItemOnHover ?? true;
  const itemToStringLabel = () => props.itemToStringLabel as ((item: any) => string) | undefined;
  const itemToStringValue = () => props.itemToStringValue as ((item: any) => string) | undefined;

  const { clearErrors } = useFormContext();
  const {
    setTouched,
    setFocused,
    setFilled,
    name: fieldName,
    disabled: fieldDisabled,
    validation,
    validationMode,
    setValidityData,
  } = useFieldRootContext();

  const generatedId = useLabelableId({ id: () => props.id });

  const disabled = () => fieldDisabled() || disabledProp();
  const name = () => fieldName() ?? props.name;

  const [value, setValueUnwrapped] = useControlled<any>({
    controlled: () => props.value,
    default: untrack(multiple) ? (defaultValue ?? EMPTY_ARRAY) : defaultValue,
    name: 'Select',
    state: 'value',
  });

  const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };
  const labelsRef: RefObject<Array<string | null>> = { current: [] };
  const popupRef: RefObject<HTMLDivElement | null> = { current: null };
  const scrollHandlerRef: RefObject<((el: HTMLDivElement) => void) | null> = { current: null };
  const scrollArrowsMountedCountRef: RefObject<number> = { current: 0 };
  const valueRef: RefObject<HTMLSpanElement | null> = { current: null };
  const valuesRef: RefObject<Array<any>> = { current: [] };
  const typingRef: RefObject<boolean> = { current: false };
  const firstItemTextRef: RefObject<HTMLElement | null> = { current: null };
  const selectedItemTextRef: RefObject<HTMLElement | null> = { current: null };
  const selectionRef = {
    current: {
      allowSelectedMouseUp: false,
      allowUnselectedMouseUp: false,
      dragY: 0,
    },
  };
  const alignItemWithTriggerActiveRef: RefObject<boolean> = { current: false };
  const initialValueRef: RefObject<any> = { current: untrack(value) };

  // Calls `onOpenChange` for every open change that isn't ignored, then applies the select's own
  // handling of an accepted change before the store commits it.
  const handleOpenChange = (nextOpen: boolean, eventDetails: SelectRoot.OpenChangeEventDetails) => {
    untrack(() => props.onOpenChange)?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    if (
      !nextOpen &&
      (eventDetails.reason === REASONS.focusOut || eventDetails.reason === REASONS.outsidePress)
    ) {
      setTouched(true);
      setFocused(false);

      if (untrack(validationMode) === 'onBlur') {
        validation.commit(untrack(value));
      }
    }
  };

  // Port note: support positioner-only compositions without a Popup animation target. The
  // transitions wait on the positioner when there is no popup. Only read from effects, once the
  // store exists.
  const transitionRef: RefObject<HTMLElement | null> = {
    get current() {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return popupRef.current ?? store.state.positionerElement;
    },
  };

  const { store, open } = useSingleAnchorPopupRoot(
    {
      get open() {
        return props.open;
      },
      get defaultOpen() {
        return props.defaultOpen;
      },
      onOpenChange: handleOpenChange,
      get onOpenChangeComplete() {
        return props.onOpenChangeComplete;
      },
      get actionsRef() {
        return props.actionsRef;
      },
    },
    (initialState, defaultPopupId) =>
      new SelectStore(
        {
          ...createInitialPopupStoreState(defaultPopupId),
          ...initialState,
          id: generatedId(),
          labelId: undefined,
          modal: modal(),
          selectionMode: multiple() ? 'multiple' : 'single',
          disabled: disabled(),
          readOnly: readOnly(),
          required: required(),
          highlightItemOnHover: highlightItemOnHover(),
          itemToStringLabel: itemToStringLabel(),
          itemToStringValue: itemToStringValue(),
          isItemEqualToValue: isItemEqualToValue(),
          selectedValue: value(),
          items: props.items,
          forceMounted: false,
          openMethod: null,
          activeIndex: null,
          selectedIndex: null,
          itemProps: EMPTY_OBJECT,
          triggerElement: null,
          listElement: null,
          popupSide: null,
          scrollUpArrowVisible: false,
          scrollDownArrowVisible: false,
          hasScrollArrows: false,
        },
        {
          ...createPopupStoreContext(),
          setValue: NOOP,
          handleScrollArrowVisibility: NOOP,
          onItemsChange: NOOP,
          listRef,
          popupRef,
          scrollHandlerRef,
          scrollArrowsMountedCountRef,
          valueRef,
          valuesRef,
          itemValues: new Map(),
          labelsRef,
          typingRef,
          selectionRef,
          firstItemTextRef,
          selectedItemTextRef,
          alignItemWithTriggerActiveRef,
          initialValueRef,
        },
        selectors,
      ),
    transitionRef,
  );

  const { openMethod, triggerProps: interactionTypeProps } = useOpenInteractionType(open);

  const activeIndex = store.useState('activeIndex');
  const selectedIndex = store.useState('selectedIndex');
  const triggerElement = store.useState('triggerElement');

  const previousOpenMethod = usePreviousValue(openMethod);
  const renderedOpenMethod = () => openMethod() ?? previousOpenMethod();

  const serializedValue = createMemo(() => {
    // In multiple mode the shared input is nameless; per-value entries are submitted via
    // `hiddenInputs`. Its value is therefore irrelevant, and passing the whole array to
    // `stringifyAsValue` would invoke a user `itemToStringValue` with an array it doesn't expect.
    if (multiple()) {
      return '';
    }
    return stringifyAsValue(value(), itemToStringValue());
  });

  const fieldStringValue = createMemo(() => {
    const currentValue = value();
    if (multiple() && Array.isArray(currentValue)) {
      return currentValue.map((v) => stringifyAsValue(v, itemToStringValue()));
    }
    return stringifyAsValue(currentValue, itemToStringValue());
  });

  const controlRef = useValueAsRef(triggerElement);
  const getStringifiedValueForForm = () => untrack(fieldStringValue);

  useRegisterFieldControl(
    controlRef,
    generatedId,
    value,
    getStringifiedValueForForm,
    () => !disabled(),
    () => props.name,
  );

  // Mirror the `hasSelectedValue` store selector so the Field's filled state agrees with the
  // trigger/value placeholder semantics (a value serializing to `''` counts as empty).
  const hasSelectedValue = createMemo(() => {
    const currentValue = value();
    return multiple()
      ? Array.isArray(currentValue) && currentValue.length > 0
      : currentValue != null && serializedValue() !== '';
  });

  useIsoLayoutEffect(
    ([nextHasSelectedValue]) => {
      setFilled(nextHasSelectedValue);
    },
    () => [hasSelectedValue()],
  );

  // Port note: `selectedIndex` is derived instead of written from an effect on every value change.
  // While closed it follows the value. While open it keeps the index it had when the popup opened
  // (or what was written since, e.g. by a selected item), like upstream's effect that skips open
  // popups. Items and the positioner still write it imperatively when the items change.
  let lastClosed: { index: number | null; raw: number | null; value: unknown } | undefined;
  const computeSelectedIndex = () =>
    findSelectionIndex(valuesRef.current, value(), isItemEqualToValue(), multiple());
  store.useDerivedState('selectedIndex', (raw) => {
    if (!open()) {
      const index = computeSelectedIndex();
      lastClosed = { index, raw, value: untrack(value) };
      return index;
    }
    if (lastClosed === undefined || !Object.is(lastClosed.value, untrack(value))) {
      lastClosed = { index: untrack(computeSelectedIndex), raw, value: untrack(value) };
    }
    return Object.is(raw, lastClosed.raw) ? lastClosed.index : raw;
  });

  useIsoLayoutEffect(
    function syncSelectedItemText([multipleValue, currentValue, comparer]) {
      if (findSelectionIndex(valuesRef.current, currentValue, comparer, multipleValue) === null) {
        selectedItemTextRef.current = null;
      }
    },
    () => [multiple(), value(), isItemEqualToValue()] as const,
  );

  useFieldDirtySource(value, (currentValue, initialValue) =>
    isSelectedValueDirty(currentValue, initialValue, isItemEqualToValue()),
  );

  useValueChanged(value, () => {
    const currentValue = untrack(value);
    clearErrors(untrack(name));

    validation.change(currentValue);
  });

  const setValue = (nextValue: any, eventDetails: SelectRoot.ChangeEventDetails) => {
    untrack(() => props.onValueChange)?.(nextValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(nextValue);
  };

  const handleScrollArrowVisibility = (scroller: HTMLElement) => {
    const maxScrollTop = getMaxScrollOffset(scroller.scrollHeight, scroller.clientHeight);
    const scrollTop = normalizeScrollOffset(scroller.scrollTop, maxScrollTop);
    const shouldShowUp = scrollTop > 0;
    const shouldShowDown = scrollTop < maxScrollTop;

    store.set('scrollUpArrowVisible', shouldShowUp);
    store.set('scrollDownArrowVisible', shouldShowDown);
  };

  // `readOnly` locks the value, not the interaction: the popup can be opened and browsed so the
  // user can see the available options and which one is selected. Committing a value is blocked
  // separately in `SelectItem` and in the hidden input's autofill handler.
  const click = useClick(store, {
    get enabled() {
      return !disabled();
    },
    event: 'mousedown',
  });

  const dismiss = useDismiss(store);

  // Bumped when the item list publishes its items (in DOM order, after they rendered), so list
  // navigation can highlight an item once they're there.
  const [itemsVersion, setItemsVersion] = createSignal(0);
  store.useContextCallback('onItemsChange', () => () => setItemsVersion((version) => version + 1));

  const listNavigation = useListNavigation(store, {
    get enabled() {
      return !disabled();
    },
    deriveOpenHighlight: true,
    get listVersion() {
      return itemsVersion();
    },
    listRef,
    get activeIndex() {
      return activeIndex();
    },
    get selectedIndex() {
      return selectedIndex();
    },
    disabledIndices: EMPTY_ARRAY,
    onNavigate(nextActiveIndex) {
      // Retain the highlight while transitioning out.
      if (nextActiveIndex === null && !untrack(open)) {
        return;
      }

      store.set('activeIndex', nextActiveIndex);
    },
    get focusItemOnHover() {
      return highlightItemOnHover();
    },
  });

  // Port note: upstream's list navigation highlights the selected item from a layout effect
  // (through `onNavigate`) when the popup opens and whenever the selected index changes while it's
  // open. Here the store derives it: that highlight, until something navigates after it. Like
  // upstream's written one, it's retained while transitioning out. Without a selected index to
  // sync (nothing selected, or navigation disabled), the highlight is left as it is.
  store.useResetState('activeIndex', () => {
    const openHighlight = listNavigation.openHighlightIndex();
    return open() && openHighlight != null ? { value: openHighlight } : undefined;
  });

  const typeahead = useTypeahead(store, {
    // Typeahead on an open popup only moves the highlight, so it remains available while
    // `readOnly`. The closed-trigger variant commits a value instead, so it doesn't.
    get enabled() {
      return !disabled() && (open() || (!readOnly() && !multiple()));
    },
    listRef: labelsRef,
    get activeIndex() {
      return activeIndex();
    },
    get selectedIndex() {
      return selectedIndex();
    },
    // Skip disabled items while matching so typeahead advances to the next selectable item
    // (a click can never select a disabled item and native `<select>` skips them too). Resolve
    // the disabled state from the element via the attribute-only `isElementDisabled` so the
    // hidden, force-mounted items used for closed-trigger typeahead aren't dropped by the
    // `elementsRef`/visibility filter that `disabledIndices` deliberately sidesteps.
    disabledIndices: (index) => isElementDisabled(listRef.current[index]),
    onMatch(index) {
      if (untrack(open)) {
        store.set('activeIndex', index);
      } else {
        setValue(valuesRef.current[index], createChangeEventDetails(REASONS.none));
      }
    },
    onTyping(typing) {
      typingRef.current = typing;
    },
  });

  // `Select.Trigger` applies the id itself from the store, so it's deliberately not merged here.
  const mergedTriggerProps = createMemo(() =>
    mergePropsSnapshot<any>(
      typeahead.reference,
      listNavigation.reference,
      dismiss.reference,
      click.reference,
      interactionTypeProps,
    ),
  );

  const popupProps = createMemo(() =>
    mergePropsSnapshot<any>(
      FOCUSABLE_POPUP_PROPS,
      typeahead.floating,
      listNavigation.floating,
      dismiss.floating,
    ),
  );

  const itemProps = createMemo(
    () => (listNavigation.item as HTMLProps | undefined) ?? EMPTY_OBJECT,
  );

  store.useContextCallback('setValue', () => setValue);
  store.useContextCallback('handleScrollArrowVisibility', () => handleScrollArrowVisibility);

  // The prop bags must be in the store before the parts render. `useSyncedValues` writes in a
  // layout effect, after all descendants have rendered.
  useOnFirstRender(() => {
    store.update({
      popupProps: popupProps(),
      activeTriggerProps: mergedTriggerProps(),
      itemProps: itemProps(),
    });
  });

  // Port note: one accessor per key (see `SolidStore.useSyncedValues`): some sources read stores
  // that depend on these keys, which a single accessor would turn into a cycle.
  store.useSyncedValues({
    id: generatedId,
    modal,
    selectionMode: () => (multiple() ? 'multiple' : 'single'),
    disabled,
    readOnly,
    required,
    highlightItemOnHover,
    selectedValue: value,
    popupProps,
    activeTriggerProps: mergedTriggerProps,
    itemProps,
    items: () => props.items,
    itemToStringLabel,
    itemToStringValue,
    isItemEqualToValue,
    openMethod: renderedOpenMethod,
  });

  const hiddenInputProps = createMemo(() =>
    validation.getValidationProps(disabled(), {
      // Port note: a `focus` listener on the input itself (React's `onFocus` bubbles, but
      // only the input's own focus matters here).
      onFocus() {
        // Move focus to the trigger element when the hidden input is focused.
        store.state.triggerElement?.focus({
          // Supported in Chrome from 144 (January 2026)
          focusVisible: true,
        } as FocusOptions);
      },
      // Handle browser autofill.
      // Port note: React's text-input `onChange` is the native `input` event.
      onInput(event: Event) {
        if (event.defaultPrevented || untrack(disabled) || untrack(readOnly)) {
          // Port note: React restores controlled inputs after rejected changes.
          (event.currentTarget as HTMLInputElement).value = untrack(serializedValue);
          return;
        }

        const input = event.currentTarget as HTMLInputElement;
        const nextValue = input.value;
        const details = createChangeEventDetails(REASONS.none, event);

        function handleChange() {
          if (untrack(multiple)) {
            // Browser autofill only writes a single scalar value.
            return;
          }

          const currentItemToStringValue = untrack(itemToStringValue);
          const currentItemToStringLabel = untrack(itemToStringLabel);

          // Preserve the original serialized matching, then fall back to rendered text,
          // which browsers can autofill for primitive values like
          // `value="US">United States`.
          const nextValueLower = nextValue.toLowerCase();
          let matchingIndex = valuesRef.current.findIndex(
            (candidate) =>
              stringifyAsValue(candidate, currentItemToStringValue).toLowerCase() ===
                nextValueLower ||
              stringifyAsLabel(candidate, currentItemToStringLabel).toLowerCase() ===
                nextValueLower,
          );

          if (matchingIndex === -1) {
            matchingIndex = valuesRef.current.findIndex((_, index) => {
              const renderedLabel = labelsRef.current[index];
              return renderedLabel != null && renderedLabel.toLowerCase() === nextValueLower;
            });
          }

          const matchingValue = valuesRef.current[matchingIndex];
          if (matchingValue != null) {
            // `setValue` may be canceled by `onValueChange`; rely on `useValueChanged` to
            // mark the field dirty and run validation only when the value actually changes.
            setValue(matchingValue, details);
          }
        }

        store.set('forceMounted', true);
        queueMicrotask(() => {
          handleChange();
          // Port note: React restores controlled inputs after every edit, including
          // unknown values, cancellation, and changes rejected by a controlled parent.
          flush();
          input.value = untrack(serializedValue);
        });
      },
    }),
  );
  // Port note: delegated input listeners suppress disabled controls. A native listener must
  // also restore autofill edits dispatched on a disabled hidden input, like React does.
  const attachAutofillListener = (node: HTMLInputElement) => {
    const listener = (event: Event) =>
      untrack(() => (hiddenInputProps().onInput as (event: Event) => void)(event));
    node.addEventListener('input', listener);
    return () => node.removeEventListener('input', listener);
  };

  const ref = useMergedRefs<HTMLInputElement>(
    () => props.inputRef,
    () => validation.inputRef,
    () => attachAutofillListener,
  );

  const hiddenInputName = () => (multiple() ? undefined : name());

  const hiddenInputValues = createMemo(() => {
    const currentValue = value();
    if (!multiple() || !Array.isArray(currentValue) || !name()) {
      return EMPTY_ARRAY as string[];
    }

    return currentValue.map((v) => stringifyAsValue(v, itemToStringValue()));
  });

  return (
    <SelectRootContext value={store}>
      {props.children}
      {useRenderElement('input', EMPTY_OBJECT, {
        ref,
        props: () => [
          { ...hiddenInputProps(), onInput: undefined },
          {
            id:
              generatedId() && hiddenInputName() == null
                ? `${generatedId()}-hidden-input`
                : undefined,
            form: props.form,
            name: hiddenInputName(),
            type: getHiddenInputType(
              setValidityData !== NOOP,
              name(),
              props.autoComplete,
              required(),
              props.inputRef,
            ),
            autocomplete: props.autoComplete,
            value: serializedValue(),
            disabled: disabled(),
            required: required() && !(multiple() && hasSelectedValue()),
            readonly: readOnly(),
            style: name() ? visuallyHiddenInput : visuallyHidden,
            tabindex: -1,
            'aria-hidden': true,
          },
        ],
      })}
      <For each={hiddenInputValues()}>
        {(currentSerializedValue) => (
          <input
            type="hidden"
            form={props.form}
            name={name()}
            value={currentSerializedValue}
            disabled={disabled()}
          />
        )}
      </For>
    </SelectRootContext>
  );
}

type SelectInputValue<Value, Multiple extends boolean | undefined> = Multiple extends true
  ? readonly Value[]
  : Value;

type SelectOutputValue<Value, Multiple extends boolean | undefined> = Multiple extends true
  ? Value[]
  : Value;

/**
 * Port note: `items` is an inference site for the value type (upstream types it as `any`), used
 * when `value`/`defaultValue` don't determine it. A flat item's value is inferred with a lower
 * priority than a group's items, so a grouped array infers its items' values.
 */
type InferredItemValue<ItemValue> = ItemValue & {};

export interface SelectRootProps<
  Value,
  Multiple extends boolean | undefined = false,
  ItemValue = Value,
> {
  children?: JSX.Element | undefined;
  /**
   * A ref callback that receives the hidden input element.
   */
  inputRef?: ((element: HTMLInputElement) => void) | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the hidden input.
   * Useful when the select is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * Provides a hint to the browser for autofill.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete
   */
  autoComplete?: JSX.HTMLAutocomplete | undefined;
  /**
   * The id of the Select.
   */
  id?: string | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the user should be unable to choose a different option from the select popup.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether multiple items can be selected.
   * @default false
   */
  multiple?: Multiple | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Whether the select popup is initially open.
   *
   * To render a controlled select popup, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the select popup is opened or closed.
   */
  onOpenChange?:
    ((open: boolean, eventDetails: SelectRootOpenChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the select popup is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the select popup is currently open.
   */
  open?: boolean | undefined;
  /**
   * Determines if the select enters a modal state when open.
   * - `true`: user interaction is limited to the select: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   *
   * On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * A callback that receives the imperative actions. It's called once, when the component is
   * set up (like a `ref` callback).
   * - `unmount`: Ends the closing phase of the select after an externally controlled closing animation finishes.
   * Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the select completes closing on its own.
   * Whether it leaves the DOM is decided by `keepMounted` on the portal.
   * - `close`: Closes the select imperatively when called.
   */
  actionsRef?: ((actions: SelectRootActions) => void) | undefined;
  /**
   * Data structure of the items rendered in the select popup.
   * When specified, `<Select.Value>` renders the label of the selected item instead of the raw value.
   * @example
   * ```tsx
   * const items = {
   *   sans: 'Sans-serif',
   *   serif: 'Serif',
   *   mono: 'Monospace',
   *   cursive: 'Cursive',
   * };
   * <Select.Root items={items} />
   * ```
   */
  items?:
    | Record<string, JSX.Element>
    | ReadonlyArray<{ label: JSX.Element; value: InferredItemValue<ItemValue> }>
    | ReadonlyArray<Group<{ label: JSX.Element; value: ItemValue }>>
    | ReadonlyArray<{ label: JSX.Element; value: any }>
    | ReadonlyArray<Group<any>>
    | undefined;
  /**
   * When the item values are objects (`<Select.Item value={object}>`), this function converts the object value to a string representation for display in the trigger.
   * If the shape of the object is `{ value, label }`, the label will be used automatically without needing to specify this prop.
   */
  itemToStringLabel?: ((itemValue: Value) => string) | undefined;
  /**
   * When the item values are objects (`<Select.Item value={object}>`), this function converts the object value to a string representation for form submission.
   * If the shape of the object is `{ value, label }`, the value will be used automatically without needing to specify this prop.
   */
  itemToStringValue?: ((itemValue: Value) => string) | undefined;
  /**
   * Custom comparison logic used to determine if a select item value matches the current selected value. Useful when item values are objects without matching referentially.
   * Defaults to `Object.is` comparison.
   */
  isItemEqualToValue?: ((itemValue: Value, value: Value) => boolean) | undefined;
  /**
   * The uncontrolled value of the select when it's initially rendered.
   *
   * To render a controlled select, use the `value` prop instead.
   */
  defaultValue?: SelectInputValue<Value, Multiple> | null | undefined;
  /**
   * The value of the select. Use when controlled.
   */
  value?: SelectInputValue<Value, Multiple> | null | undefined;
  /**
   * Event handler called when the value of the select changes.
   */
  onValueChange?:
    | ((
        value: SelectOutputValue<Value, Multiple> | (Multiple extends true ? never : null),
        eventDetails: SelectRootChangeEventDetails,
      ) => void)
    | undefined;
}

export interface SelectRootState {}

export interface SelectRootActions {
  unmount: () => void;
  close: () => void;
}

export type SelectRootChangeEventReason =
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.windowResize
  | typeof REASONS.itemPress
  | typeof REASONS.focusOut
  | typeof REASONS.listNavigation
  | typeof REASONS.cancelOpen
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type SelectRootOpenChangeEventDetails = SelectRootChangeEventDetails & {
  /** Prevents the popup from unmounting until the `unmount` action is called. */
  preventUnmountOnClose: () => void;
};

export type SelectRootChangeEventDetails = BaseUIChangeEventDetails<SelectRootChangeEventReason>;

export namespace SelectRoot {
  export type Props<
    Value,
    Multiple extends boolean | undefined = false,
    ItemValue = Value,
  > = SelectRootProps<Value, Multiple, ItemValue>;
  export type State = SelectRootState;
  export type Actions = SelectRootActions;
  export type ChangeEventReason = SelectRootChangeEventReason;
  export type ChangeEventDetails = SelectRootChangeEventDetails;
  export type OpenChangeEventDetails = SelectRootOpenChangeEventDetails;
}
