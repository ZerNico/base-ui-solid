import { expect, describe, it } from 'vitest';
import { screen, createRenderer } from '#test-utils';
import { Autocomplete } from 'base-ui-solid/autocomplete';

describe('<Autocomplete.Value />', () => {
  const { render } = createRenderer();

  describe('prop: children', () => {
    it('renders current input value via function child', async () => {
      await render((overrides) => (
        <Autocomplete.Root defaultValue="hel" {...overrides()}>
          <Autocomplete.Trigger>
            <Autocomplete.Value>{(val) => <div data-testid="value">{val}</div>}</Autocomplete.Value>
          </Autocomplete.Trigger>
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.List>
                  <Autocomplete.Item value="hello">hello</Autocomplete.Item>
                  <Autocomplete.Item value="help">help</Autocomplete.Item>
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      ));

      expect(screen.getByTestId('value')).toHaveTextContent('hel');
    });

    it('renders function child with empty string when no value typed', async () => {
      await render((overrides) => (
        <Autocomplete.Root {...overrides()}>
          <Autocomplete.Value>
            {(val) => <div data-testid="value">{val === '' ? 'empty' : String(val)}</div>}
          </Autocomplete.Value>
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.List>
                  <Autocomplete.Item value="a">a</Autocomplete.Item>
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      ));

      expect(screen.getByTestId('value')).toHaveTextContent('empty');
    });

    it('overrides the display when children is a static ReactNode', async () => {
      await render((overrides) => (
        <Autocomplete.Root defaultValue="test-value" {...overrides()}>
          <Autocomplete.Value>Custom Display Text</Autocomplete.Value>
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.List>
                  <Autocomplete.Item value="test-value">Test</Autocomplete.Item>
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      ));

      expect(screen.getByText('Custom Display Text')).not.toBe(null);
    });

    it('renders complex ReactNode children', async () => {
      await render((overrides) => (
        <Autocomplete.Root defaultValue="test" {...overrides()}>
          <Autocomplete.Value>
            <span data-testid="complex">
              <strong>Bold</strong> and <em>italic</em> text
            </span>
          </Autocomplete.Value>
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.List>
                  <Autocomplete.Item value="test">Test</Autocomplete.Item>
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      ));

      const element = screen.getByTestId('complex');
      expect(element.querySelector('strong')).toHaveTextContent('Bold');
      expect(element.querySelector('em')).toHaveTextContent('italic');
    });
  });
});
