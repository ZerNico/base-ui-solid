import { createMemo, omit } from 'solid-js';
import { error } from '@base-ui-solid/utils/error';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useLabel } from '../../internals/labelable-provider/useLabel';
import { useFieldItemContext } from '../item/FieldItemContext';

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<label>` element.
 *
 * Documentation: [Base UI Field](https://base-ui-solid.pages.dev/solid/components/field)
 */
export function FieldLabel(componentProps: FieldLabel.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id', 'nativeLabel');

  const fieldRootContext = useFieldRootContext(false);
  const fieldItemContext = useFieldItemContext();
  const { labelId } = useLabelableContext();

  const nativeLabel = () => componentProps.nativeLabel ?? true;

  const state = createMemo<FieldLabelState>(() => ({
    ...fieldRootContext.state(),
    disabled: (fieldRootContext.disabled() ?? false) || fieldItemContext.disabled(),
  }));

  let labelElement: HTMLElement | null = null;
  const labelProps = useLabel({
    id: () => labelId() ?? (componentProps.id || undefined),
    native: nativeLabel,
  });

  if (IS_DEV) {
    useEffect(
      ([isNativeLabel]) => {
        if (!labelElement) {
          return;
        }

        const isLabelTag = labelElement.tagName === 'LABEL';

        if (isNativeLabel) {
          if (!isLabelTag) {
            error(
              '<Field.Label> expected a <label> element because the `nativeLabel` prop is true. ' +
                'Rendering a non-<label> disables native label association, so `for` will not ' +
                'work. Use a real <label> in the `render` prop, or set `nativeLabel` to `false`.',
            );
          }
        } else if (isLabelTag) {
          error(
            '<Field.Label> expected a non-<label> element because the `nativeLabel` prop is false. ' +
              'Rendering a <label> assumes native label behavior while Base UI treats it as ' +
              'non-native, which can cause unexpected pointer behavior. Use a non-<label> in the ' +
              '`render` prop, or set `nativeLabel` to `true`.',
          );
        }
      },
      () => [nativeLabel()],
    );
  }

  return useRenderElement('label', componentProps, {
    ref: (element: HTMLElement | null) => {
      labelElement = element;
    },
    state,
    props: () => [labelProps(), elementProps],
    stateAttributesMapping: fieldValidityMapping,
  });
}

export interface FieldLabelState extends FieldRootState {}

export interface FieldLabelProps extends BaseUIComponentProps<'label', FieldLabelState> {
  /**
   * Whether the component renders a native `<label>` element when replacing it via the `render` prop.
   * Set to `false` if the rendered element is not a label (for example, `<div>`).
   *
   * This is useful to avoid inheriting label behaviors on `<button>` controls (such as `<Select.Trigger>` and `<Combobox.Trigger>`), including avoiding `:hover` on the button when hovering the label, and preventing clicks on the label from firing on the button.
   * @default true
   */
  nativeLabel?: boolean | undefined;
}

export namespace FieldLabel {
  export type State = FieldLabelState;
  export type Props = FieldLabelProps;
}
