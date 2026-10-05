import type { JSX } from '@solidjs/web';
import { createSignal, flush, For } from 'solid-js';

import { it, expect, vi, describe, afterEach } from 'vitest';
import { render, screen, flushMicrotasks } from '#test-utils';
import { Accordion } from '../accordion';
import { Collapsible } from '../collapsible';
import { Field } from '../field';
import { Checkbox } from '../checkbox';
import { Fieldset } from '../fieldset';
import { Radio } from '../radio';
import { RadioGroup } from '../radio-group';
import { Tabs } from '../tabs';
import { Menu } from '../menu';
import { Popover } from '../popover';
import { Dialog } from '../dialog';
import { Tooltip } from '../tooltip';
import { NumberField } from '../number-field';
import { Slider } from '../slider';
import { Select } from '../select';
import { Combobox } from '../combobox';
import { CheckboxGroup } from '../checkbox-group';

// Port note: regressions absent upstream. Solid forbids signal writes while an owner is being
// disposed by a computation (`<For>`, `<Show>`), so cleanups that write state (registrations,
// label ids, panel state) used to throw REACTIVE_WRITE_IN_OWNED_SCOPE and halt reactivity.
describe('removing parts rendered in a <For>', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function removeItems(
    renderItem: (id: string) => JSX.Element,
    wrap?: (list: () => JSX.Element) => JSX.Element,
  ) {
    const errorSpy = vi.spyOn(console, 'error');
    const windowErrors: unknown[] = [];
    const onError = (event: ErrorEvent) => windowErrors.push(event.error ?? event.message);
    window.addEventListener('error', onError);

    const [items, setItems] = createSignal(['a', 'b', 'c']);
    const [count, setCount] = createSignal(0);
    const list = () => <For each={items()}>{(id) => renderItem(id)}</For>;
    await render(() => (
      <div>
        <span data-testid="count">{count()}</span>
        {wrap ? wrap(list) : list()}
      </div>
    ));

    let thrown: unknown;
    try {
      setItems(['a', 'c']);
      flush();
      await flushMicrotasks();
      setItems(['c']);
      flush();
      await flushMicrotasks();
    } catch (error) {
      thrown = error;
    }

    setCount(1);
    flush();
    await flushMicrotasks();
    window.removeEventListener('error', onError);

    return {
      thrown,
      windowErrors,
      consoleErrors: errorSpy.mock.calls.map((call) => String(call[0])),
      count: screen.getByTestId('count').textContent,
    };
  }

  const safe = { thrown: undefined, windowErrors: [], consoleErrors: [], count: '1' };

  it('Accordion.Item', async () => {
    expect(
      await removeItems(
        (id) => (
          <Accordion.Item value={id}>
            <Accordion.Header>
              <Accordion.Trigger>{id}</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel>Body {id}</Accordion.Panel>
          </Accordion.Item>
        ),
        (list) => <Accordion.Root defaultValue={['b']}>{list()}</Accordion.Root>,
      ),
    ).toEqual(safe);
  });

  it('Collapsible', async () => {
    expect(
      await removeItems((id) => (
        <Collapsible.Root defaultOpen={id === 'b'}>
          <Collapsible.Trigger>{id}</Collapsible.Trigger>
          <Collapsible.Panel>panel</Collapsible.Panel>
        </Collapsible.Root>
      )),
    ).toEqual(safe);
  });

  it('Field.Root', async () => {
    expect(
      await removeItems((id) => (
        <Field.Root>
          <Field.Label>{id}</Field.Label>
          <Field.Control />
          <Field.Description>d</Field.Description>
          <Field.Error match>e</Field.Error>
        </Field.Root>
      )),
    ).toEqual(safe);
  });

  it('Checkbox with Field.Label', async () => {
    expect(
      await removeItems((id) => (
        <Field.Root>
          <Checkbox.Root>
            <Checkbox.Indicator />
          </Checkbox.Root>
          <Field.Label>{id}</Field.Label>
        </Field.Root>
      )),
    ).toEqual(safe);
  });

  it('Field.Root in a Fieldset', async () => {
    expect(
      await removeItems(
        (id) => (
          <Field.Root>
            <Field.Label>{id}</Field.Label>
            <Field.Control />
          </Field.Root>
        ),
        (list) => (
          <Fieldset.Root>
            <Fieldset.Legend>legend</Fieldset.Legend>
            {list()}
          </Fieldset.Root>
        ),
      ),
    ).toEqual(safe);
  });

  it('Radio', async () => {
    expect(
      await removeItems(
        (id) => <Radio.Root value={id}>{id}</Radio.Root>,
        (list) => <RadioGroup defaultValue="b">{list()}</RadioGroup>,
      ),
    ).toEqual(safe);
  });

  it('Tabs.Tab and Tabs.Panel', async () => {
    expect(
      await removeItems(
        (id) => (
          <>
            <Tabs.Tab value={id}>{id}</Tabs.Tab>
            <Tabs.Panel value={id}>{id}</Tabs.Panel>
          </>
        ),
        (list) => (
          <Tabs.Root defaultValue="b">
            <Tabs.List>{list()}</Tabs.List>
          </Tabs.Root>
        ),
      ),
    ).toEqual(safe);
  });

  it('Menu.Item', async () => {
    expect(
      await removeItems(
        (id) => <Menu.Item>{id}</Menu.Item>,
        (list) => (
          <Menu.Root defaultOpen>
            <Menu.Trigger>m</Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>{list()}</Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ),
      ),
    ).toEqual(safe);
  });

  it('open Popover', async () => {
    expect(
      await removeItems((id) => (
        <Popover.Root defaultOpen={id === 'b'}>
          <Popover.Trigger>{id}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>pop {id}</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )),
    ).toEqual(safe);
  });

  it('open Dialog', async () => {
    expect(
      await removeItems((id) => (
        <Dialog.Root defaultOpen={id === 'b'} modal={false}>
          <Dialog.Trigger>{id}</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Popup>
              <Dialog.Title>title</Dialog.Title>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )),
    ).toEqual(safe);
  });

  it('open Tooltip', async () => {
    expect(
      await removeItems((id) => (
        <Tooltip.Root defaultOpen={id === 'b'}>
          <Tooltip.Trigger>{id}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup>tip</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      )),
    ).toEqual(safe);
  });

  it('open Select', async () => {
    expect(
      await removeItems((id) => (
        <Select.Root defaultOpen={id === 'b'} defaultValue="x">
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.Item value="x">x</Select.Item>
                <Select.Item value="y">y</Select.Item>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      )),
    ).toEqual(safe);
  });

  it('open Combobox', async () => {
    expect(
      await removeItems((id) => (
        <Combobox.Root defaultOpen={id === 'b'} items={['x', 'y']}>
          <Combobox.Input />
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  {(item) => <Combobox.Item value={item()}>{item()}</Combobox.Item>}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      )),
    ).toEqual(safe);
  });

  it('NumberField', async () => {
    expect(
      await removeItems((id) => (
        <Field.Root>
          <Field.Label>{id}</Field.Label>
          <NumberField.Root defaultValue={1}>
            <NumberField.ScrubArea>
              <NumberField.ScrubAreaCursor />
            </NumberField.ScrubArea>
            <NumberField.Group>
              <NumberField.Decrement />
              <NumberField.Input />
              <NumberField.Increment />
            </NumberField.Group>
          </NumberField.Root>
        </Field.Root>
      )),
    ).toEqual(safe);
  });

  it('Slider', async () => {
    expect(
      await removeItems((id) => (
        <Slider.Root defaultValue={[10, 20]} aria-label={id}>
          <Slider.Control>
            <Slider.Track>
              <Slider.Indicator />
              <Slider.Thumb index={0} />
              <Slider.Thumb index={1} />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
      )),
    ).toEqual(safe);
  });

  it('Checkbox in a CheckboxGroup', async () => {
    expect(
      await removeItems(
        (id) => (
          <Field.Item>
            <Field.Label>
              <Checkbox.Root value={id} />
              {id}
            </Field.Label>
          </Field.Item>
        ),
        (list) => (
          <Field.Root>
            <CheckboxGroup defaultValue={['b']}>{list()}</CheckboxGroup>
          </Field.Root>
        ),
      ),
    ).toEqual(safe);
  });
});
