import { createSignal, flush } from 'solid-js';

import { expect, describe, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { createRenderer, describeConformance, screen } from '#test-utils';

describe('<Combobox.GroupLabel />', () => {
  const { render } = createRenderer();
  describeConformance((props) => <Combobox.GroupLabel {...props} />, {
    refInstanceof: window.HTMLDivElement,
    wrap(node) {
      return (
        <Combobox.Root open>
          <Combobox.Group>{node()}</Combobox.Group>
        </Combobox.Root>
      );
    },
  });
  describe('a11y attributes', () => {
    it('wires to group aria-labelledby', async () => {
      await render(() => (
        <Combobox.Root open>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Group>
                  <Combobox.GroupLabel>Label</Combobox.GroupLabel>
                </Combobox.Group>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const group = screen.getByRole('group');
      const label = screen.getByText('Label');
      expect(group).toHaveAttribute('aria-labelledby', label.id);
    });
    it('is hidden from the accessibility tree by default', async () => {
      await render(() => (
        <Combobox.Root open>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Group>
                  <Combobox.GroupLabel>Label</Combobox.GroupLabel>
                </Combobox.Group>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      expect(screen.getByText('Label')).toHaveAttribute('aria-hidden', 'true');
    });
    it('allows overriding aria-hidden', async () => {
      await render(() => (
        <Combobox.Root open>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Group>
                  <Combobox.GroupLabel aria-hidden={undefined}>Label</Combobox.GroupLabel>
                </Combobox.Group>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      expect(screen.getByText('Label')).not.toHaveAttribute('aria-hidden');
    });
    it('uses provided id in aria-labelledby', async () => {
      await render(() => (
        <Combobox.Root open>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Group>
                  <Combobox.GroupLabel id="test-group">Label</Combobox.GroupLabel>
                </Combobox.Group>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-labelledby', 'test-group');
    });
    it('does not let an older label cleanup clear a newer label', async () => {
      function Test(props: { labels: 'old' | 'both' | 'new' }) {
        return (
          <Combobox.Root open>
            <Combobox.Group>
              {props.labels !== 'new' && (
                <Combobox.GroupLabel id="old-label">Old</Combobox.GroupLabel>
              )}
              {props.labels !== 'old' && (
                <Combobox.GroupLabel id="new-label">New</Combobox.GroupLabel>
              )}
            </Combobox.Group>
          </Combobox.Root>
        );
      }
      const [labels, setLabels] = createSignal<'old' | 'both' | 'new'>('old');
      await render(() => <Test labels={labels()} />);
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-labelledby', 'old-label');
      setLabels('both');
      flush();
      expect(group).toHaveAttribute('aria-labelledby', 'new-label');
      setLabels('new');
      flush();
      expect(group).toHaveAttribute('aria-labelledby', 'new-label');
    });
  });
});
