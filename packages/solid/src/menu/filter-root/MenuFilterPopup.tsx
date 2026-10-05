import { merge } from 'solid-js';
import { useMenuFilterPopup } from './useMenuFilterPopup';
import type { FloatingFocusManagerProps } from '../../floating-ui-solid/components/FloatingFocusManager';
import { MenuPopupPlain } from '../popup/MenuPopup';
import type { MenuPopupProps } from '../popup/MenuPopup';
import { useMenuRootContext } from '../root/MenuRootContext';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import { REASONS } from '../../internals/reasons';
/**
 * A container for the filter input and item list.
 * Renders a `<div>` element with a `dialog` role.
 */
export function MenuFilterPopup(props: MenuPopupProps) {
  const root = useMenuRootContext();
  const { store } = root;
  const open = store.useState('open');
  const parent = store.useState('parent');
  const openMethod = store.useState('openMethod');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const interactionProps = useMenuFilterPopup(() => root.orientation);
  const initialFocus = (): FloatingFocusManagerProps['initialFocus'] => {
    const mayFocusInput =
      parent().type !== 'menu' ||
      (open() &&
        (openMethod() === 'keyboard' ||
          lastOpenChangeReason() === REASONS.listNavigation ||
          lastOpenChangeReason() === REASONS.triggerHover ||
          lastOpenChangeReason() === REASONS.triggerPress));
    if (!mayFocusInput) {
      return false;
    }
    return () => {
      const touchOpen =
        (openMethod() === 'touch' || openMethod() === 'pen') && !store.context.virtualPress;
      if ((open() && lastOpenChangeReason() === REASONS.triggerHover) || touchOpen) {
        return false;
      }
      return store.context.virtualFocusRef?.current ?? false;
    };
  };
  const popupProps = merge(() =>
    mergePropsSnapshot<typeof MenuPopupPlain>(interactionProps, props),
  );
  return <MenuPopupPlain {...popupProps} role="dialog" initialFocus={initialFocus()} />;
}
