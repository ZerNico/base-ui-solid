import { expect, describe, it } from 'vitest';
import { createSignal } from 'solid-js';
import { Dialog } from 'base-ui-solid/dialog';
import { describeConformance, render, screen } from '#test-utils';

describe('<Dialog.Backdrop />', () => {
  describeConformance(Dialog.Backdrop, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Dialog.Root open modal={false}>
        {node()}
      </Dialog.Root>
    ),
  });

  it('has role="presentation"', async () => {
    await render(() => (
      <Dialog.Root open>
        <Dialog.Backdrop data-testid="backdrop" />
      </Dialog.Root>
    ));

    expect(screen.getByTestId('backdrop')).toHaveAttribute('role', 'presentation');
  });

  describe('prop: forceRender', () => {
    it('renders only the root backdrop by default', async () => {
      function App() {
        const [nestedOpen, setNestedOpen] = createSignal(true);

        return (
          <Dialog.Root open>
            <Dialog.Backdrop data-testid="root-backdrop" />
            <Dialog.Portal>
              <Dialog.Popup>
                Root dialog
                <Dialog.Root open={nestedOpen()} onOpenChange={setNestedOpen}>
                  <Dialog.Backdrop data-testid="nested-backdrop" />
                  <Dialog.Portal>
                    <Dialog.Popup>Nested dialog</Dialog.Popup>
                  </Dialog.Portal>
                </Dialog.Root>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        );
      }

      await render(() => <App />);

      expect(screen.getByTestId('root-backdrop')).not.toBe(null);
      expect(screen.queryByTestId('nested-backdrop')).toBe(null);
    });

    it('always renders by default when not nested', async () => {
      await render(() => (
        <Dialog.Root open>
          <Dialog.Backdrop data-testid="backdrop" />
          <Dialog.Portal>
            <Dialog.Popup>Content</Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      ));

      expect(screen.getByTestId('backdrop')).not.toBe(null);
    });

    it('renders only the root backdrop with multiple nesting levels', async () => {
      function App() {
        const [level2Open, setLevel2Open] = createSignal(true);
        const [level3Open, setLevel3Open] = createSignal(true);

        return (
          <Dialog.Root open>
            <Dialog.Backdrop data-testid="level-1-backdrop" />
            <Dialog.Portal>
              <Dialog.Popup>
                Level 1 dialog
                <Dialog.Root open={level2Open()} onOpenChange={setLevel2Open}>
                  <Dialog.Backdrop data-testid="level-2-backdrop" />
                  <Dialog.Portal>
                    <Dialog.Popup>
                      Level 2 dialog
                      <Dialog.Root open={level3Open()} onOpenChange={setLevel3Open}>
                        <Dialog.Backdrop data-testid="level-3-backdrop" />
                        <Dialog.Portal>
                          <Dialog.Popup>Level 3 dialog</Dialog.Popup>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </Dialog.Root>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        );
      }

      await render(() => <App />);

      expect(screen.getByTestId('level-1-backdrop')).not.toBe(null);
      expect(screen.queryByTestId('level-2-backdrop')).toBe(null);
      expect(screen.queryByTestId('level-3-backdrop')).toBe(null);
    });

    it('always renders when true', async () => {
      function App() {
        const [level2Open, setLevel2Open] = createSignal(true);
        const [level3Open, setLevel3Open] = createSignal(true);

        return (
          <Dialog.Root open>
            <Dialog.Backdrop data-testid="level-1-backdrop" forceRender />
            <Dialog.Portal>
              <Dialog.Popup>
                Level 1 dialog
                <Dialog.Root open={level2Open()} onOpenChange={setLevel2Open}>
                  <Dialog.Backdrop data-testid="level-2-backdrop" forceRender />
                  <Dialog.Portal>
                    <Dialog.Popup>
                      Level 2 dialog
                      <Dialog.Root open={level3Open()} onOpenChange={setLevel3Open}>
                        <Dialog.Backdrop data-testid="level-3-backdrop" forceRender />
                        <Dialog.Portal>
                          <Dialog.Popup>Level 3 dialog</Dialog.Popup>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </Dialog.Root>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        );
      }

      await render(() => <App />);

      expect(screen.getByTestId('level-1-backdrop')).not.toBe(null);
      expect(screen.getByTestId('level-2-backdrop')).not.toBe(null);
      expect(screen.getByTestId('level-3-backdrop')).not.toBe(null);
    });
  });
});
