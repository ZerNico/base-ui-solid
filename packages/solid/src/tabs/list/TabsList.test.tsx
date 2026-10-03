import { expect, describe, it } from 'vitest';
import { Show, createSignal, flush } from 'solid-js';
import { Tabs } from 'base-ui-solid/tabs';
import { describeConformance, fireEvent, flushMicrotasks, render, screen } from '#test-utils';

describe('<Tabs.List />', () => {
  describeConformance(Tabs.List, {
    wrap: (node) => <Tabs.Root>{node()}</Tabs.Root>,
    refInstanceof: window.HTMLDivElement,
  });

  describe('accessibility attributes', () => {
    it('sets the aria-selected attribute on the active tab', async () => {
      await render(() => (
        <Tabs.Root defaultValue={1}>
          <Tabs.List>
            <Tabs.Tab value={1}>Tab 1</Tabs.Tab>
            <Tabs.Tab value={2}>Tab 2</Tabs.Tab>
            <Tabs.Tab value={3}>Tab 3</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      ));

      const tab1 = screen.getByText('Tab 1');
      const tab2 = screen.getByText('Tab 2');
      const tab3 = screen.getByText('Tab 3');

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab3).toHaveAttribute('aria-selected', 'false');

      tab2.click();
      await flushMicrotasks();

      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'true');
      expect(tab3).toHaveAttribute('aria-selected', 'false');

      tab3.click();
      await flushMicrotasks();

      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab3).toHaveAttribute('aria-selected', 'true');

      tab1.click();
      await flushMicrotasks();

      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab3).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('prop: loopFocus', () => {
    it('does not wrap focus past the first tab when `loopFocus` is false', async () => {
      await render(() => (
        <Tabs.Root value={0}>
          <Tabs.List loopFocus={false}>
            <Tabs.Tab value={0} />
            <Tabs.Tab value={1} />
            <Tabs.Tab value={2} />
          </Tabs.List>
        </Tabs.Root>
      ));

      const [firstTab, , lastTab] = screen.getAllByRole('tab');
      firstTab.focus();
      await flushMicrotasks();

      fireEvent.keyDown(firstTab, { key: 'ArrowLeft' });
      await flushMicrotasks();

      expect(firstTab).toHaveFocus();
      expect(lastTab).not.toHaveFocus();
    });

    it('does not wrap focus past the last tab when `loopFocus` is false', async () => {
      await render(() => (
        <Tabs.Root value={2}>
          <Tabs.List loopFocus={false}>
            <Tabs.Tab value={0} />
            <Tabs.Tab value={1} />
            <Tabs.Tab value={2} />
          </Tabs.List>
        </Tabs.Root>
      ));

      const [firstTab, , lastTab] = screen.getAllByRole('tab');
      lastTab.focus();
      await flushMicrotasks();

      fireEvent.keyDown(lastTab, { key: 'ArrowRight' });
      await flushMicrotasks();

      expect(lastTab).toHaveFocus();
      expect(firstTab).not.toHaveFocus();
    });
  });

  describe('keyboard navigation', () => {
    it('moves focus to a tab disabled with the `disabled` prop', async () => {
      await render(() => (
        <Tabs.Root value={0}>
          <Tabs.List>
            <Tabs.Tab value={0} />
            <Tabs.Tab value={1} disabled />
            <Tabs.Tab value={2} />
          </Tabs.List>
        </Tabs.Root>
      ));

      const [firstTab, disabledTab] = screen.getAllByRole('tab');
      firstTab.focus();
      await flushMicrotasks();

      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
      await flushMicrotasks();

      expect(disabledTab).toHaveFocus();
    });

    it('skips a natively disabled tab in a single keypress', async () => {
      await render(() => (
        <Tabs.Root value={0}>
          <Tabs.List>
            <Tabs.Tab value={0} />
            {/* Port note: `render={<button type="button" disabled />}` is a React element; a
            render function is used instead. */}
            <Tabs.Tab value={1} render={(props) => <button {...props} type="button" disabled />} />
            <Tabs.Tab value={2} />
          </Tabs.List>
        </Tabs.Root>
      ));

      const [firstTab, , lastTab] = screen.getAllByRole('tab');
      firstTab.focus();
      await flushMicrotasks();

      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
      await flushMicrotasks();

      expect(lastTab).toHaveFocus();

      fireEvent.keyDown(lastTab, { key: 'ArrowLeft' });
      await flushMicrotasks();

      expect(firstTab).toHaveFocus();
    });
  });

  describe('roving focus after tab removal', () => {
    it('moves the tab stop off a hidden successor when the highlighted tab is removed', async () => {
      const [showMiddleTab, setShowMiddleTab] = createSignal(true);

      await render(() => (
        <Tabs.Root defaultValue={0}>
          <Tabs.List>
            <Tabs.Tab value={0}>Tab 0</Tabs.Tab>
            <Show when={showMiddleTab()}>
              <Tabs.Tab value={1}>Tab 1</Tabs.Tab>
            </Show>
            <Tabs.Tab value={2} hidden>
              Tab 2
            </Tabs.Tab>
            <Tabs.Tab value={3}>Tab 3</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      ));

      const selectedTab = screen.getByText('Tab 0');
      selectedTab.focus();
      await flushMicrotasks();
      fireEvent.keyDown(selectedTab, { key: 'ArrowRight' });
      await flushMicrotasks();

      setShowMiddleTab(false);
      flush();
      await flushMicrotasks();

      const tabs = screen.getAllByRole('tab', { hidden: true });
      expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    });

    it('can fall back to a tab that is focusable when disabled', async () => {
      const [showSelectedTab, setShowSelectedTab] = createSignal(true);

      await render(() => (
        <Tabs.Root value={2}>
          <Tabs.List>
            <Tabs.Tab value={0} disabled>
              Tab 0
            </Tabs.Tab>
            <Tabs.Tab value={1}>Tab 1</Tabs.Tab>
            <Show when={showSelectedTab()}>
              <Tabs.Tab value={2}>Tab 2</Tabs.Tab>
            </Show>
          </Tabs.List>
        </Tabs.Root>
      ));

      setShowSelectedTab(false);
      flush();
      await flushMicrotasks();

      expect(screen.getByText('Tab 0')).toHaveAttribute('tabindex', '0');
      expect(screen.getByText('Tab 1')).toHaveAttribute('tabindex', '-1');
    });

    it('keeps the tab stop on the selected tab when focus is inside the list', async () => {
      const [showFirstTab, setShowFirstTab] = createSignal(true);

      await render(() => (
        <Tabs.Root value={2}>
          <Tabs.List>
            <Show when={showFirstTab()}>
              <Tabs.Tab value={0}>Tab 0</Tabs.Tab>
            </Show>
            <Tabs.Tab value={1}>Tab 1</Tabs.Tab>
            <Tabs.Tab value={2}>Tab 2</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      ));

      const selectedTab = screen.getByText('Tab 2');
      selectedTab.focus();
      await flushMicrotasks();

      setShowFirstTab(false);
      flush();
      await flushMicrotasks();

      const [unselectedTab] = screen.getAllByRole('tab');

      expect([unselectedTab.tabIndex, selectedTab.tabIndex]).toEqual([-1, 0]);
    });

    it('keeps tracking a successor through subsequent removals', async () => {
      const [props, setProps] = createSignal({ showFirstTab: true, showSelectedTab: true });

      await render(() => (
        <Tabs.Root value={1}>
          <Tabs.List>
            <Show when={props().showFirstTab}>
              <Tabs.Tab value={0}>Tab 0</Tabs.Tab>
            </Show>
            <Show when={props().showSelectedTab}>
              <Tabs.Tab value={1}>Tab 1</Tabs.Tab>
            </Show>
            <Tabs.Tab value={2}>Tab 2</Tabs.Tab>
            <Tabs.Tab value={3}>Tab 3</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      ));

      setProps({ showFirstTab: true, showSelectedTab: false });
      flush();
      await flushMicrotasks();

      expect(screen.getByText('Tab 2')).toHaveAttribute('tabindex', '0');

      setProps({ showFirstTab: false, showSelectedTab: false });
      flush();
      await flushMicrotasks();

      expect(screen.getByText('Tab 2')).toHaveAttribute('tabindex', '0');
      expect(screen.getByText('Tab 3')).toHaveAttribute('tabindex', '-1');
    });
  });

  it('can be named via `aria-label`', async () => {
    await render(() => (
      <Tabs.Root defaultValue={0}>
        <Tabs.List aria-label="string label">
          <Tabs.Tab value={0} />
        </Tabs.List>
      </Tabs.Root>
    ));

    expect(screen.getByRole('tablist')).toHaveAccessibleName('string label');
  });

  it('can be named via `aria-labelledby`', async () => {
    await render(() => (
      <>
        <h3 id="label-id">complex name</h3>
        <Tabs.Root defaultValue={0}>
          <Tabs.List aria-labelledby="label-id">
            <Tabs.Tab value={0} />
          </Tabs.List>
        </Tabs.Root>
      </>
    ));

    expect(screen.getByRole('tablist')).toHaveAccessibleName('complex name');
  });
});
