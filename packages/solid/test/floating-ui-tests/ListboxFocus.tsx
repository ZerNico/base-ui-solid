import { createContext, createSignal, useContext } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useTestInteractions } from '#test-utils';
import { CompositeList } from '../../src/internals/composite/list/CompositeList';
import { useCompositeListItem } from '../../src/internals/composite/list/useCompositeListItem';
import { useListNavigation, useTypeahead } from '../../src/floating-ui-solid';
import { useFloating } from './useFloating';

/**
 * Port note: `activeIndex` and `selectedIndex` are getters.
 */
interface SelectContextValue {
  activeIndex: number | null;
  selectedIndex: number | null;
  getItemProps: ReturnType<typeof useTestInteractions>['getItemProps'];
  handleSelect: (index: number | null) => void;
}

const SelectContext = createContext<SelectContextValue>({} as SelectContextValue);

/** @internal */
function Listbox(props: { children: JSX.Element }) {
  const [activeIndex, setActiveIndex] = createSignal<number | null>(1, { ownedWrite: true });
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null, {
    ownedWrite: true,
  });

  const { refs, context } = useFloating({
    open: true,
  });

  const elementsRef: RefObject<Array<HTMLElement | null>> = { current: [] };
  const labelsRef: RefObject<Array<string | null>> = { current: [] };

  const handleSelect = (index: number | null) => {
    setSelectedIndex(index);
  };

  function handleTypeaheadMatch(index: number | null) {
    setActiveIndex(index);
  }

  const listNav = useListNavigation(context.rootStore, {
    listRef: elementsRef,
    get activeIndex() {
      return activeIndex();
    },
    get selectedIndex() {
      return selectedIndex();
    },
    onNavigate: setActiveIndex,
    focusItemOnHover: false,
  });
  const typeahead = useTypeahead(context.rootStore, {
    listRef: labelsRef,
    get activeIndex() {
      return activeIndex();
    },
    get selectedIndex() {
      return selectedIndex();
    },
    onMatch: handleTypeaheadMatch,
  });
  const { getFloatingProps, getItemProps } = useTestInteractions([listNav, typeahead]);

  const selectContext: SelectContextValue = {
    get activeIndex() {
      return activeIndex();
    },
    get selectedIndex() {
      return selectedIndex();
    },
    getItemProps,
    handleSelect,
  };

  return (
    <SelectContext value={selectContext}>
      <button onClick={() => setSelectedIndex(1)} data-testid="reference" type="button">
        Select
      </button>
      <div ref={refs.setFloating} id={context.floatingId} role="listbox" {...getFloatingProps()}>
        <CompositeList elementsRef={elementsRef} labelsRef={labelsRef}>
          {props.children}
        </CompositeList>
      </div>
    </SelectContext>
  );
}

/** @internal */
function Option(props: { label: string }) {
  const select = useContext(SelectContext);

  const { ref, index } = useCompositeListItem({ label: () => props.label });

  const isActive = () => select.activeIndex === index();
  const isSelected = () => select.selectedIndex === index();

  const isFocusable = () =>
    // eslint-disable-next-line no-nested-ternary
    select.activeIndex !== null
      ? isActive()
      : select.selectedIndex !== null
        ? isSelected()
        : index() === 0;

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      // Port note: Solid removes `false` attributes, React renders them.
      aria-selected={isActive() && isSelected() ? 'true' : 'false'}
      tabindex={isFocusable() ? 0 : -1}
      style={{
        background: isActive() ? 'cyan' : '',
        'font-weight': isSelected() ? 'bold' : '',
      }}
      {...select.getItemProps({
        onClick: () => select.handleSelect(index()),
      })}
    >
      {props.label}
    </button>
  );
}

/** @internal */
export function Main() {
  return (
    <Listbox>
      <Option label="Apple" />
      <Option label="Blueberry" />
      <Option label="Watermelon" />
      <Option label="Banana" />
    </Listbox>
  );
}
