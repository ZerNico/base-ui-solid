import { createSignal, flush, For } from 'solid-js';
import { expect, vi, describe, it } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { Dialog } from 'base-ui-solid/dialog';
import { createRenderer, fireEvent, flushMicrotasks, isJSDOM, screen } from '#test-utils';
import { useToastManager } from './useToastManager';
import { List } from './utils/test-utils';

// Port note: `fireEvent` from '#test-utils' doesn't flush Solid (upstream's is wrapped in `act`),
// so every `fireEvent` call is followed by `flush()`.

async function tick(clock: ReturnType<typeof createRenderer>['clock'], ms: number) {
  clock.tick(ms);
  await flushMicrotasks();
}

describe.skipIf(!isJSDOM)('useToast', () => {
  describe('add', () => {
    const { clock, render } = createRenderer();

    clock.withFakeTimers();

    it('adds a toast to the viewport that auto-dismisses after 5s by default', async () => {
      function AddButton() {
        const { add } = useToastManager();
        return (
          <button
            onClick={() => {
              add({
                title: 'test',
              });
            }}
          >
            add
          </button>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <List />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      const button = screen.getByRole('button', { name: 'add' });
      fireEvent.click(button);
      flush();

      expect(screen.queryByTestId('root')).not.toBe(null);

      await tick(clock, 5000);

      expect(screen.queryByTestId('root')).toBe(null);
    });

    it('keeps multiple providers isolated when one provider updates', async () => {
      function ProviderContents(props: { label: string; title: string }) {
        const toastManager = useToastManager();
        const { add, update } = toastManager;
        let id: string | null = null;

        return (
          <>
            <Toast.Viewport>
              <For each={toastManager.toasts} keyed={(toast) => toast.id}>
                {(toast) => (
                  <Toast.Root toast={toast()}>
                    <Toast.Title>{toast().title}</Toast.Title>
                  </Toast.Root>
                )}
              </For>
            </Toast.Viewport>
            <button
              onClick={() => {
                id = add({
                  title: props.title,
                });
              }}
            >
              add {props.label}
            </button>
            <button
              onClick={() => {
                if (id) {
                  update(id, {
                    title: `${props.title} updated`,
                  });
                }
              }}
            >
              update {props.label}
            </button>
          </>
        );
      }

      await render(() => (
        <>
          <Toast.Provider>
            <ProviderContents label="first" title="First toast" />
          </Toast.Provider>
          <Toast.Provider>
            <ProviderContents label="second" title="Second toast" />
          </Toast.Provider>
        </>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add first' }));
      flush();
      fireEvent.click(screen.getByRole('button', { name: 'add second' }));
      flush();

      expect(screen.getByText('First toast')).not.toBe(null);
      expect(screen.getByText('Second toast')).not.toBe(null);

      fireEvent.click(screen.getByRole('button', { name: 'update first' }));
      flush();

      expect(screen.getByText('First toast updated')).not.toBe(null);
      expect(screen.queryByText('Second toast updated')).toBe(null);
      expect(screen.getByText('Second toast')).not.toBe(null);
    });

    it('replaces a closing toast when adding again with the same id', async () => {
      function Buttons() {
        const toastManager = useToastManager();
        const { add, close } = toastManager;
        let toastId: string | null = null;

        return (
          <>
            <button
              onClick={() => {
                toastId = add({
                  id: 'save',
                  title: 'Saving…',
                  timeout: 0,
                });
              }}
            >
              add
            </button>
            <button
              onClick={() => {
                if (toastId) {
                  close(toastId);
                }
              }}
            >
              close
            </button>
            <button
              onClick={() => {
                toastId = add({
                  id: 'save',
                  title: 'Saved',
                  timeout: 0,
                });
              }}
            >
              re-add
            </button>
            <div data-testid="toast-count">{toastManager.toasts.length}</div>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <List />
          </Toast.Viewport>
          <Buttons />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();
      expect(screen.getByTestId('title')).toHaveTextContent('Saving…');
      expect(screen.queryAllByTestId('root')).toHaveLength(1);

      fireEvent.click(screen.getByRole('button', { name: 'close' }));
      flush();
      fireEvent.click(screen.getByRole('button', { name: 're-add' }));
      flush();

      expect(screen.getByTestId('title')).toHaveTextContent('Saved');
      expect(screen.queryAllByTestId('root')).toHaveLength(1);
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });

    it('does not call onRemove when replacing an ending toast', async () => {
      const onRemoveSpy = vi.fn();

      function Buttons() {
        const toastManager = useToastManager();
        const { add, close } = toastManager;
        let toastId: string | null = null;

        return (
          <>
            <button
              onClick={() => {
                toastId = add({
                  id: 'save',
                  title: 'Saving…',
                  timeout: 0,
                  onRemove: onRemoveSpy,
                });
              }}
            >
              add
            </button>
            <button
              onClick={() => {
                if (toastId) {
                  close(toastId);
                }
              }}
            >
              close
            </button>
            <button
              onClick={() => {
                toastId = add({
                  id: 'save',
                  title: 'Saved',
                  timeout: 0,
                });
              }}
            >
              re-add
            </button>
            <div data-testid="toast-count">{toastManager.toasts.length}</div>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Buttons />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      fireEvent.click(screen.getByRole('button', { name: 'close' }));
      flush();
      fireEvent.click(screen.getByRole('button', { name: 're-add' }));
      flush();

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(onRemoveSpy).toHaveBeenCalledTimes(0);
    });

    it('calls onRemove once after replacing an ending toast and later removing the replacement', async () => {
      const onRemoveSpy = vi.fn();

      function Buttons() {
        const toastManager = useToastManager();
        const { add, close } = toastManager;
        let toastId: string | null = null;
        const [showViewport, setShowViewport] = createSignal(false);

        return (
          <>
            {showViewport() ? (
              <Toast.Viewport>
                <List />
              </Toast.Viewport>
            ) : null}
            <button
              onClick={() => {
                toastId = add({
                  id: 'save',
                  title: 'Saving…',
                  timeout: 0,
                  onRemove: onRemoveSpy,
                });
              }}
            >
              add
            </button>
            <button
              onClick={() => {
                if (toastId) {
                  close(toastId);
                }
              }}
            >
              close
            </button>
            <button
              onClick={() => {
                toastId = add({
                  id: 'save',
                  title: 'Saved',
                  timeout: 0,
                  onRemove: onRemoveSpy,
                });
              }}
            >
              re-add
            </button>
            <button onClick={() => setShowViewport(true)}>show viewport</button>
            <div data-testid="toast-count">{toastManager.toasts.length}</div>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Buttons />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();
      fireEvent.click(screen.getByRole('button', { name: 'close' }));
      flush();
      fireEvent.click(screen.getByRole('button', { name: 're-add' }));
      flush();

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(onRemoveSpy).toHaveBeenCalledTimes(0);

      fireEvent.click(screen.getByRole('button', { name: 'show viewport' }));
      flush();
      fireEvent.click(screen.getByRole('button', { name: 'close' }));
      flush();

      expect(onRemoveSpy).toHaveBeenCalledTimes(1);
    });

    it('ignores transitionStatus when upserting an existing toast', async () => {
      function Buttons() {
        const toastManager = useToastManager();
        const { add } = toastManager;

        return (
          <>
            <button
              onClick={() => {
                add({
                  id: 'save',
                  title: 'Saving…',
                  timeout: 0,
                });
              }}
            >
              add
            </button>
            <button
              onClick={() => {
                add({
                  id: 'save',
                  title: 'Saved',
                  timeout: 0,
                  transitionStatus: 'ending',
                });
              }}
            >
              upsert
            </button>
            <For each={toastManager.toasts} keyed={(toast) => toast.id}>
              {(toast) => (
                <>
                  <div data-testid="title-value">{toast().title}</div>
                  <div data-testid="transition-status">{toast().transitionStatus}</div>
                </>
              )}
            </For>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Buttons />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();
      expect(screen.getByTestId('title-value')).toHaveTextContent('Saving…');
      expect(screen.getByTestId('transition-status')).toHaveTextContent('starting');

      fireEvent.click(screen.getByRole('button', { name: 'upsert' }));
      flush();
      expect(screen.getByTestId('title-value')).toHaveTextContent('Saved');
      expect(screen.getByTestId('transition-status')).toHaveTextContent('starting');
    });

    it('increments updateKey when adding again with the same id', async () => {
      function Buttons() {
        const toastManager = useToastManager();
        const { add } = toastManager;

        return (
          <>
            <button
              onClick={() => {
                add({
                  id: 'save',
                  title: 'Draft saved',
                  timeout: 0,
                });
              }}
            >
              add
            </button>
            <For each={toastManager.toasts} keyed={(toast) => toast.id}>
              {(toast) => <div data-testid="update-key">{toast().updateKey}</div>}
            </For>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Buttons />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();
      expect(screen.getByTestId('update-key')).toHaveTextContent('0');

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();
      expect(screen.getByTestId('update-key')).toHaveTextContent('1');
    });

    describe('option: timeout', () => {
      it('dismisses the toast after the specified timeout', async () => {
        function AddButton() {
          const { add } = useToastManager();
          return <button onClick={() => add({ title: 'test', timeout: 1000 })}>add</button>;
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <List />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        expect(screen.queryByTestId('root')).not.toBe(null);

        await tick(clock, 1000);

        expect(screen.queryByTestId('root')).toBe(null);
      });
    });

    describe('option: title', () => {
      it('renders the title', async () => {
        function AddButton() {
          const { add } = useToastManager();
          return (
            <button
              onClick={() =>
                add({
                  title: 'title',
                  description: 'description',
                })
              }
            >
              add
            </button>
          );
        }

        function CustomList() {
          const toastManager = useToastManager();
          return (
            <For each={toastManager.toasts} keyed={(t) => t.id}>
              {(t) => (
                <Toast.Root toast={t()} data-testid="root">
                  <Toast.Title data-testid="title">{t().title}</Toast.Title>
                </Toast.Root>
              )}
            </For>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        expect(screen.queryByTestId('title')).toHaveTextContent('title');
      });
    });

    describe('option: description', () => {
      it('renders the description', async () => {
        function AddButton() {
          const { add } = useToastManager();
          return (
            <button
              onClick={() =>
                add({
                  title: 'title',
                  description: 'description',
                })
              }
            >
              add
            </button>
          );
        }

        function CustomList() {
          const toastManager = useToastManager();
          return (
            <For each={toastManager.toasts} keyed={(t) => t.id}>
              {(t) => (
                <Toast.Root toast={t()} data-testid="root">
                  <Toast.Description data-testid="description">{t().description}</Toast.Description>
                </Toast.Root>
              )}
            </For>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        expect(screen.queryByTestId('description')).toHaveTextContent('description');
      });
    });

    describe('option: type', () => {
      it('renders the type', async () => {
        function AddButton() {
          const { add } = useToastManager();
          return <button onClick={() => add({ title: 'test', type: 'success' })}>add</button>;
        }

        function CustomList() {
          const toastManager = useToastManager();
          return (
            <For each={toastManager.toasts} keyed={(t) => t.id}>
              {(t) => (
                <Toast.Root toast={t()} data-testid="root">
                  <Toast.Title data-testid="title">{t().title}</Toast.Title>
                  <span>{t().type}</span>
                </Toast.Root>
              )}
            </For>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        expect(screen.queryByTestId('title')).toHaveTextContent('test');
        expect(screen.queryByText('success')).not.toBe(null);
      });
    });

    describe('option: onClose', () => {
      it('calls onClose when the toast is closed', async () => {
        const onCloseSpy = vi.fn();

        function AddButton() {
          const { add, close } = useToastManager();
          let id: string | null = null;
          return (
            <>
              <button
                onClick={() => {
                  id = add({
                    title: 'test',
                    onClose: onCloseSpy,
                  });
                }}
              >
                add
              </button>
              <button
                onClick={() => {
                  if (id) {
                    close(id);
                  }
                }}
              >
                close
              </button>
            </>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <List />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const addButton = screen.getByRole('button', { name: 'add' });
        fireEvent.click(addButton);
        flush();

        expect(onCloseSpy.mock.calls.length).toBe(0);

        const closeButton = screen.getByRole('button', { name: 'close' });
        fireEvent.click(closeButton);
        flush();

        expect(onCloseSpy.mock.calls.length).toBe(1);
      });

      it('calls onClose when the toast auto-dismisses', async () => {
        const onCloseSpy = vi.fn();

        function AddButton() {
          const { add } = useToastManager();
          return (
            <button
              onClick={() => {
                add({
                  title: 'test',
                  timeout: 1000,
                  onClose: onCloseSpy,
                });
              }}
            >
              add
            </button>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <List />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        expect(onCloseSpy.mock.calls.length).toBe(0);

        await tick(clock, 1000);

        expect(onCloseSpy.mock.calls.length).toBe(1);
      });
    });

    describe('option: onRemove', () => {
      it('calls onRemove when the toast is removed', async () => {
        const onRemoveSpy = vi.fn();

        function AddButton() {
          const { add, close } = useToastManager();
          let id: string | null = null;
          return (
            <>
              <button
                onClick={() => {
                  id = add({
                    title: 'test',
                    onRemove: onRemoveSpy,
                  });
                }}
              >
                add
              </button>
              <button
                onClick={() => {
                  if (id) {
                    close(id);
                  }
                }}
              >
                close
              </button>
            </>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <List />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const addButton = screen.getByRole('button', { name: 'add' });
        fireEvent.click(addButton);
        flush();

        expect(onRemoveSpy.mock.calls.length).toBe(0);

        const closeButton = screen.getByRole('button', { name: 'close' });
        fireEvent.click(closeButton);
        flush();

        expect(onRemoveSpy.mock.calls.length).toBe(1);
      });
    });

    describe('option: priority', () => {
      it('applies correct ARIA attributes for high priority toasts', async () => {
        function AddButton() {
          const { add } = useToastManager();
          return (
            <button onClick={() => add({ title: 'high priority', priority: 'high' })}>
              add high
            </button>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <List />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const highPriorityButton = screen.getByRole('button', { name: 'add high' });
        fireEvent.click(highPriorityButton);
        flush();

        const highRoot = screen.getByTestId('root');

        expect(highRoot.getAttribute('role')).toBe('alertdialog');
        expect(highRoot.getAttribute('aria-modal')).toBe('false');
        expect(screen.getByRole('alert')).not.toBe(null);
        expect(screen.getByRole('alert').getAttribute('aria-atomic')).toBe('true');

        const closeHighButton = screen.getByLabelText('close-press');
        fireEvent.click(closeHighButton);
        flush();

        expect(screen.queryByRole('alert')).toBe(null);
      });
    });
  });

  describe('promise', () => {
    const { clock, render } = createRenderer();

    clock.withFakeTimers();

    function CustomList() {
      const toastManager = useToastManager();
      return (
        <For each={toastManager.toasts} keyed={(t) => t.id}>
          {(t) => (
            <Toast.Root toast={t()} data-testid="root">
              <Toast.Title data-testid="title">{t().title}</Toast.Title>
              <Toast.Description data-testid="description">{t().description}</Toast.Description>
              <Toast.Close aria-label="close-press" />
              <span>{t().type}</span>
            </Toast.Root>
          )}
        </For>
      );
    }

    it('displays success state as description after promise resolves', async () => {
      function AddButton() {
        const { promise } = useToastManager();
        return (
          <button
            onClick={() => {
              promise(
                new Promise((res) => {
                  setTimeout(() => {
                    res('success');
                  }, 1000);
                }),
                {
                  loading: 'loading',
                  success: 'success',
                  error: 'error',
                },
              );
            }}
          >
            add
          </button>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      const button = screen.getByRole('button', { name: 'add' });
      fireEvent.click(button);
      flush();

      expect(screen.getByTestId('description')).toHaveTextContent('loading');

      await tick(clock, 1000);

      expect(screen.getByTestId('description')).toHaveTextContent('success');
    });

    it('displays error state as description after promise rejects', async () => {
      function AddButton() {
        const { promise } = useToastManager();
        return (
          <button
            onClick={() => {
              promise(
                new Promise((res, rej) => {
                  setTimeout(() => {
                    rej(new Error('error'));
                  }, 1000);
                }),
                {
                  loading: 'loading',
                  success: 'success',
                  error: 'error',
                },
              ).catch(() => {
                // Explicitly catch rejection to prevent test failure
              });
            }}
          >
            add
          </button>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      const button = screen.getByRole('button', { name: 'add' });
      fireEvent.click(button);
      flush();

      expect(screen.getByTestId('description')).toHaveTextContent('loading');

      await tick(clock, 1000);

      expect(screen.getByTestId('description')).toHaveTextContent('error');
    });

    it('passes data when success is a function', async () => {
      function AddButton() {
        const { promise } = useToastManager();
        return (
          <button
            onClick={() =>
              promise(
                new Promise((res) => {
                  res('test success');
                }),
                {
                  loading: 'loading',
                  success: (data) => `${data}`,
                  error: 'error',
                },
              )
            }
          >
            add
          </button>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      const button = screen.getByRole('button', { name: 'add' });
      fireEvent.click(button);
      flush();

      expect(screen.getByTestId('description')).toHaveTextContent('loading');

      await tick(clock, 1000);

      expect(screen.getByTestId('description')).toHaveTextContent('test success');
    });

    it('accepts a function that returns full options for the success state', async () => {
      function AddButton() {
        const { promise } = useToastManager();
        return (
          <button
            onClick={() =>
              promise(
                new Promise<string>((res) => {
                  res('everything');
                }),
                {
                  loading: 'loading',
                  success: (data) => ({
                    title: `saved ${data}`,
                    description: 'done',
                    timeout: 2000,
                  }),
                  error: 'error',
                },
              )
            }
          >
            add
          </button>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();

      await tick(clock, 1000);

      expect(screen.getByTestId('title')).toHaveTextContent('saved everything');
      expect(screen.getByTestId('description')).toHaveTextContent('done');

      // The `timeout` from the resolved options object is honored too.
      await tick(clock, 1999);
      expect(screen.queryByTestId('root')).not.toBe(null);

      await tick(clock, 2);
      expect(screen.queryByTestId('root')).toBe(null);
    });

    it('passes data when error is a function', async () => {
      function AddButton() {
        const { promise } = useToastManager();
        return (
          <button
            onClick={() =>
              promise(
                new Promise((res, rej) => {
                  rej(new Error('test error'));
                }),
                {
                  loading: 'loading',
                  success: 'success',
                  error: (error: Error) => `${error.message}`,
                },
              ).catch(() => {
                // Explicitly catch rejection to prevent test failure
              })
            }
          >
            add
          </button>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      const button = screen.getByRole('button', { name: 'add' });
      fireEvent.click(button);
      flush();

      expect(screen.getByTestId('description')).toHaveTextContent('loading');

      await tick(clock, 1000);

      expect(screen.getByTestId('description')).toHaveTextContent('test error');
    });

    it('supports custom options', async () => {
      function AddButton() {
        const { promise } = useToastManager();
        return (
          <button
            onClick={() =>
              promise(
                new Promise((res) => {
                  res('success');
                }),
                {
                  loading: {
                    title: 'loading title',
                    description: 'loading description',
                  },
                  success: 'success',
                  error: 'error',
                },
              )
            }
          >
            add
          </button>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      const button = screen.getByRole('button', { name: 'add' });
      fireEvent.click(button);
      flush();

      expect(screen.getByTestId('title')).toHaveTextContent('loading title');
      expect(screen.getByTestId('description')).toHaveTextContent('loading description');

      await flushMicrotasks();
    });

    it('does not reopen a dismissed promise toast when it resolves', async () => {
      let resolvePromise: (value: string) => void = () => {
        throw new Error('Promise resolver should be assigned before resolving.');
      };

      function AddButton() {
        const { promise } = useToastManager();
        return (
          <button
            onClick={() => {
              const pendingPromise = new Promise<string>((resolve) => {
                resolvePromise = resolve;
              });

              promise(pendingPromise, {
                loading: 'loading',
                success: 'success',
                error: 'error',
              });
            }}
          >
            add
          </button>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();

      expect(screen.getByTestId('description')).toHaveTextContent('loading');

      fireEvent.click(screen.getByLabelText('close-press'));
      flush();
      resolvePromise('success');

      await flushMicrotasks();

      expect(screen.queryByTestId('root')).toBe(null);
    });

    describe('timeout handling', () => {
      it('auto-dismisses success toast after default timeout when promise resolves', async () => {
        function AddButton() {
          const { promise } = useToastManager();
          return (
            <button
              onClick={() => {
                promise(
                  new Promise((res) => {
                    setTimeout(() => {
                      res('success');
                    }, 1000);
                  }),
                  {
                    loading: 'loading',
                    success: 'success',
                    error: 'error',
                  },
                );
              }}
            >
              add
            </button>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        expect(screen.getByTestId('description')).toHaveTextContent('loading');

        await tick(clock, 1000);

        expect(screen.getByTestId('description')).toHaveTextContent('success');

        await tick(clock, 5000);

        expect(screen.queryByTestId('root')).toBe(null);
      });

      it('auto-dismisses error toast after default timeout when promise rejects', async () => {
        function AddButton() {
          const { promise } = useToastManager();
          return (
            <button
              onClick={() => {
                promise(
                  new Promise((res, rej) => {
                    setTimeout(() => {
                      rej(new Error('error'));
                    }, 1000);
                  }),
                  {
                    loading: 'loading',
                    success: 'success',
                    error: 'error',
                  },
                ).catch(() => {
                  // Explicitly catch rejection to prevent test failure
                });
              }}
            >
              add
            </button>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        expect(screen.getByTestId('description')).toHaveTextContent('loading');

        await tick(clock, 1000);

        expect(screen.getByTestId('description')).toHaveTextContent('error');

        await tick(clock, 5000);
        expect(screen.queryByTestId('root')).toBe(null);
      });

      it('uses custom timeout from success options when promise resolves', async () => {
        function AddButton() {
          const { promise } = useToastManager();
          return (
            <button
              onClick={() => {
                promise(
                  new Promise((res) => {
                    setTimeout(() => {
                      res('success');
                    }, 1000);
                  }),
                  {
                    loading: 'loading',
                    success: {
                      description: 'success',
                      timeout: 2000,
                    },
                    error: 'error',
                  },
                );
              }}
            >
              add
            </button>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        await tick(clock, 1000);

        expect(screen.getByTestId('description')).toHaveTextContent('success');

        await tick(clock, 1000);
        expect(screen.getByTestId('root')).not.toBe(null);

        await tick(clock, 1000);
        expect(screen.queryByTestId('root')).toBe(null);
      });

      it('uses custom timeout from error options when promise rejects', async () => {
        function AddButton() {
          const { promise } = useToastManager();
          return (
            <button
              onClick={() => {
                promise(
                  new Promise((res, rej) => {
                    setTimeout(() => {
                      rej(new Error('error'));
                    }, 1000);
                  }),
                  {
                    loading: 'loading',
                    success: 'success',
                    error: {
                      description: 'error',
                      timeout: 3000,
                    },
                  },
                ).catch(() => {
                  // Explicitly catch rejection to prevent test failure
                });
              }}
            >
              add
            </button>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        await tick(clock, 1000);

        expect(screen.getByTestId('description')).toHaveTextContent('error');

        await tick(clock, 2000);
        expect(screen.getByTestId('root')).not.toBe(null);

        await tick(clock, 1000);
        expect(screen.queryByTestId('root')).toBe(null);
      });

      it('uses provider timeout when no custom timeout is specified', async () => {
        function AddButton() {
          const { promise } = useToastManager();
          return (
            <button
              onClick={() => {
                promise(
                  new Promise((res) => {
                    setTimeout(() => {
                      res('success');
                    }, 1000);
                  }),
                  {
                    loading: 'loading',
                    success: 'success',
                    error: 'error',
                  },
                );
              }}
            >
              add
            </button>
          );
        }

        await render(() => (
          <Toast.Provider timeout={1000}>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        await tick(clock, 1000);

        expect(screen.getByTestId('description')).toHaveTextContent('success');

        await tick(clock, 1000);
        expect(screen.queryByTestId('root')).toBe(null);
      });

      it('does not inherit a loading timeout when success does not specify one', async () => {
        function AddButton() {
          const { promise } = useToastManager();
          return (
            <button
              onClick={() => {
                promise(
                  new Promise((res) => {
                    setTimeout(() => {
                      res('success');
                    }, 1000);
                  }),
                  {
                    loading: {
                      description: 'loading',
                      timeout: 0,
                    },
                    success: 'success',
                    error: 'error',
                  },
                );
              }}
            >
              add
            </button>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        fireEvent.click(screen.getByRole('button', { name: 'add' }));
        flush();
        expect(screen.getByTestId('description')).toHaveTextContent('loading');

        await tick(clock, 1000);
        expect(screen.getByTestId('description')).toHaveTextContent('success');

        await tick(clock, 5000);
        expect(screen.queryByTestId('root')).toBe(null);
      });

      it('does not auto-dismiss when timeout is set to 0', async () => {
        function AddButton() {
          const { promise } = useToastManager();
          return (
            <button
              onClick={() => {
                promise(
                  new Promise((res) => {
                    setTimeout(() => {
                      res('success');
                    }, 1000);
                  }),
                  {
                    loading: 'loading',
                    success: {
                      description: 'success',
                      timeout: 0,
                    },
                    error: 'error',
                  },
                );
              }}
            >
              add
            </button>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        await tick(clock, 1000);

        expect(screen.getByTestId('description')).toHaveTextContent('success');

        await tick(clock, 10000);
        expect(screen.getByTestId('root')).not.toBe(null);
      });

      it('pauses timers when hovering over toast', async () => {
        function AddButton() {
          const { promise } = useToastManager();
          return (
            <button
              onClick={() => {
                promise(
                  new Promise((res) => {
                    setTimeout(() => {
                      res('success');
                    }, 1000);
                  }),
                  {
                    loading: 'loading',
                    success: {
                      description: 'success',
                      timeout: 3000,
                    },
                    error: 'error',
                  },
                );
              }}
            >
              add
            </button>
          );
        }

        await render(() => (
          <Toast.Provider>
            <Toast.Viewport>
              <CustomList />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        ));

        const button = screen.getByRole('button', { name: 'add' });
        fireEvent.click(button);
        flush();

        await tick(clock, 1000);

        expect(screen.getByTestId('description')).toHaveTextContent('success');

        await tick(clock, 1000);

        // Port note: React derives `mouseenter`/`mouseleave` for every ancestor from a single
        // `mouseover`/`mouseout`, so upstream's events on the toast also reach the viewport's
        // `onMouseEnter`/`onMouseLeave`. Native `mouseenter`/`mouseleave` don't bubble, so they're
        // also dispatched on the viewport, like a real pointer entering/leaving the toast would.
        const toast = screen.getByTestId('root');
        const viewport = screen.getByRole('region');
        fireEvent.mouseEnter(viewport);
        fireEvent.mouseEnter(toast);
        flush();

        await tick(clock, 5000);
        expect(screen.getByTestId('root')).not.toBe(null);

        fireEvent.mouseLeave(toast);
        fireEvent.mouseLeave(viewport);
        flush();
        await tick(clock, 2000);
        expect(screen.queryByTestId('root')).toBe(null);
      });
    });
  });

  describe('update', () => {
    const { clock, render } = createRenderer();

    clock.withFakeTimers();

    function CustomList() {
      const toastManager = useToastManager();
      return (
        <For each={toastManager.toasts} keyed={(t) => t.id}>
          {(t) => (
            <Toast.Root toast={t()} data-testid="root">
              <Toast.Title data-testid="title">{t().title}</Toast.Title>
            </Toast.Root>
          )}
        </For>
      );
    }

    it('updates the toast', async () => {
      function AddButton() {
        const { add, update } = useToastManager();
        let id: string | null = null;
        return (
          <>
            <button
              type="button"
              onClick={() => {
                id = add({ title: 'test' });
              }}
            >
              add
            </button>
            <button
              type="button"
              onClick={() => {
                if (id) {
                  update(id, { title: 'updated' });
                }
              }}
            >
              update
            </button>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      const button = screen.getByRole('button', { name: 'add' });
      fireEvent.click(button);
      flush();

      expect(screen.getByTestId('title')).toHaveTextContent('test');

      const updateButton = screen.getByRole('button', { name: 'update' });
      fireEvent.click(updateButton);
      flush();

      expect(screen.getByTestId('title')).toHaveTextContent('updated');
    });

    it('increments updateKey when updating a toast', async () => {
      function Buttons() {
        const toastManager = useToastManager();
        const { add, update } = toastManager;
        let id: string | null = null;

        return (
          <>
            <button
              type="button"
              onClick={() => {
                id = add({
                  id: 'save',
                  title: 'Draft saved',
                  timeout: 0,
                });
              }}
            >
              add
            </button>
            <button
              type="button"
              onClick={() => {
                if (id) {
                  update(id, { title: 'Draft synced' });
                }
              }}
            >
              update
            </button>
            <For each={toastManager.toasts} keyed={(toast) => toast.id}>
              {(toast) => <div data-testid="update-key">{toast().updateKey}</div>}
            </For>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Buttons />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();
      expect(screen.getByTestId('update-key')).toHaveTextContent('0');

      fireEvent.click(screen.getByRole('button', { name: 'update' }));
      flush();
      expect(screen.getByTestId('update-key')).toHaveTextContent('1');
    });

    it('auto-dismisses when timeout changes from 0 to a positive value', async () => {
      function AddButton() {
        const { add, update } = useToastManager();
        let id: string | null = null;
        return (
          <>
            <button
              type="button"
              onClick={() => {
                id = add({ title: 'test', timeout: 0 });
              }}
            >
              add
            </button>
            <button
              type="button"
              onClick={() => {
                if (id) {
                  update(id, { timeout: 1000 });
                }
              }}
            >
              update
            </button>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();
      expect(screen.queryByTestId('root')).not.toBe(null);

      fireEvent.click(screen.getByRole('button', { name: 'update' }));
      flush();
      await tick(clock, 1000);

      expect(screen.queryByTestId('root')).toBe(null);
    });

    it('schedules a timer when updating a loading toast to a non-loading type', async () => {
      function AddButton() {
        const { add, update } = useToastManager();
        let id: string | null = null;
        return (
          <>
            <button
              type="button"
              onClick={() => {
                id = add({ title: 'loading', type: 'loading' });
              }}
            >
              add
            </button>
            <button
              type="button"
              onClick={() => {
                if (id) {
                  update(id, { title: 'success', type: 'success', timeout: 1000 });
                }
              }}
            >
              update
            </button>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();
      expect(screen.getByTestId('title')).toHaveTextContent('loading');

      fireEvent.click(screen.getByRole('button', { name: 'update' }));
      flush();
      expect(screen.getByTestId('title')).toHaveTextContent('success');

      await tick(clock, 1000);
      expect(screen.queryByTestId('root')).toBe(null);
    });
  });

  describe('close', () => {
    const { clock, render } = createRenderer();

    clock.withFakeTimers();

    function CustomList() {
      const toastManager = useToastManager();
      return (
        <For each={toastManager.toasts} keyed={(t) => t.id}>
          {(t) => (
            <Toast.Root toast={t()} data-testid="root">
              <Toast.Title data-testid="title">{t().title}</Toast.Title>
            </Toast.Root>
          )}
        </For>
      );
    }

    it('closes a toast', async () => {
      function AddButton() {
        const { add, close } = useToastManager();
        let id: string | null = null;
        return (
          <>
            <button
              onClick={() => {
                id = add({ title: 'test' });
              }}
            >
              add
            </button>
            <button
              onClick={() => {
                if (id) {
                  close(id);
                }
              }}
            >
              close
            </button>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      const addButton = screen.getByRole('button', { name: 'add' });
      fireEvent.click(addButton);
      flush();

      expect(screen.getByTestId('root')).not.toBe(null);

      const closeButton = screen.getByRole('button', { name: 'close' });
      fireEvent.click(closeButton);
      flush();

      expect(screen.queryByTestId('root')).toBe(null);
    });

    it('closes all toasts', async () => {
      function AddButton() {
        const { add, close } = useToastManager();
        return (
          <>
            <button
              onClick={() => {
                add({ title: 'test' });
              }}
            >
              add
            </button>
            <button
              onClick={() => {
                close();
              }}
            >
              close
            </button>
          </>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <CustomList />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      const addButton = screen.getByRole('button', { name: 'add' });
      Array.from({ length: 5 }).forEach(() => {
        fireEvent.click(addButton);
        flush();
      });

      expect(screen.getAllByTestId('root')).toHaveLength(5);

      const closeButton = screen.getByRole('button', { name: 'close' });
      fireEvent.click(closeButton);
      flush();

      expect(screen.queryByTestId('root')).toBe(null);
    });
  });

  describe('prop: timeout', () => {
    const { clock, render } = createRenderer();

    clock.withFakeTimers();

    it('applies a changed timeout to toasts added afterwards', async () => {
      function App(props: { timeout: number }) {
        return (
          <Toast.Provider timeout={props.timeout}>
            <Toast.Viewport>
              <List />
            </Toast.Viewport>
            <AddButton />
          </Toast.Provider>
        );
      }

      function AddButton() {
        const { add } = useToastManager();
        return <button onClick={() => add({ title: 'test' })}>add</button>;
      }

      // Port note: upstream's `setProps` becomes a signal write followed by a flush.
      const [timeout, setTimeoutProp] = createSignal(5000);
      await render(() => <App timeout={timeout()} />);

      setTimeoutProp(1000);
      await flushMicrotasks();

      fireEvent.click(screen.getByRole('button', { name: 'add' }));
      flush();

      await tick(clock, 999);
      expect(screen.queryByTestId('root')).not.toBe(null);

      await tick(clock, 2);
      expect(screen.queryByTestId('root')).toBe(null);
    });
  });

  describe('prop: limit', () => {
    const { clock, render } = createRenderer();

    clock.withFakeTimers();

    function TestList() {
      const [count, setCount] = createSignal(0);
      const toastManager = useToastManager();
      const { add } = toastManager;
      return (
        <>
          <For each={toastManager.toasts} keyed={(t) => t.id}>
            {(t) => (
              <Toast.Root toast={t()} data-testid={t().title}>
                <Toast.Close data-testid={`close-${t().title}`} />
              </Toast.Root>
            )}
          </For>
          <button
            onClick={() => {
              const nextCount = count() + 1;
              setCount(nextCount);
              add({ title: `toast-${nextCount}` });
            }}
          >
            add
          </button>
        </>
      );
    }

    it('marks toasts as limited when the limit is exceeded', async () => {
      await render(() => (
        <Toast.Provider limit={2}>
          <Toast.Viewport>
            <TestList />
          </Toast.Viewport>
        </Toast.Provider>
      ));

      const addButton = screen.getByRole('button', { name: 'add' });

      fireEvent.click(addButton);
      flush();
      const toast1 = screen.getByTestId('toast-1');
      expect(toast1).not.toHaveAttribute('data-limited');

      fireEvent.click(addButton);
      flush();
      const toast2 = screen.getByTestId('toast-2');
      expect(toast2).not.toHaveAttribute('data-limited');

      fireEvent.click(addButton);
      flush();
      const toast3 = screen.getByTestId('toast-3');
      expect(toast3).not.toHaveAttribute('data-limited');
      expect(toast1).toHaveAttribute('data-limited');
    });

    it('unmarks toasts as limited when the limit is not exceeded', async () => {
      await render(() => (
        <Toast.Provider limit={2}>
          <Toast.Viewport>
            <TestList />
          </Toast.Viewport>
        </Toast.Provider>
      ));

      const addButton = screen.getByRole('button', { name: 'add' });

      fireEvent.click(addButton);
      flush();
      const toast1 = screen.getByTestId('toast-1');
      expect(toast1).not.toHaveAttribute('data-limited');

      fireEvent.click(addButton);
      flush();
      const toast2 = screen.getByTestId('toast-2');
      expect(toast2).not.toHaveAttribute('data-limited');

      fireEvent.click(addButton);
      flush();
      const toast3 = screen.getByTestId('toast-3');
      expect(toast3).not.toHaveAttribute('data-limited');

      const closeToast3 = screen.getByTestId('close-toast-3');
      fireEvent.click(closeToast3);
      flush();

      expect(toast1).not.toHaveAttribute('data-limited');
    });

    it('preserves limited state when upserting a limited toast', async () => {
      function LimitedToastExample() {
        const toastManager = useToastManager();
        const { add } = toastManager;

        return (
          <>
            <For each={toastManager.toasts} keyed={(toast) => toast.id}>
              {(toast) => (
                <Toast.Root toast={toast()} data-testid={String(toast().title)}>
                  <Toast.Title />
                </Toast.Root>
              )}
            </For>
            <button
              onClick={() => {
                add({ id: 'save', title: 'Saving…', timeout: 0 });
              }}
            >
              add save
            </button>
            <button
              onClick={() => {
                add({ id: 'other', title: 'Other toast', timeout: 0 });
              }}
            >
              add other
            </button>
            <button
              onClick={() => {
                add({ id: 'save', title: 'Saved', timeout: 0 });
              }}
            >
              upsert save
            </button>
          </>
        );
      }

      await render(() => (
        <Toast.Provider limit={1}>
          <Toast.Viewport>
            <LimitedToastExample />
          </Toast.Viewport>
        </Toast.Provider>
      ));

      fireEvent.click(screen.getByRole('button', { name: 'add save' }));
      flush();
      const savingToast = screen.getByTestId('Saving…');
      expect(savingToast).not.toHaveAttribute('data-limited');

      fireEvent.click(screen.getByRole('button', { name: 'add other' }));
      flush();
      expect(savingToast).toHaveAttribute('data-limited');
      expect(screen.getByTestId('Other toast')).not.toHaveAttribute('data-limited');

      fireEvent.click(screen.getByRole('button', { name: 'upsert save' }));
      flush();
      const savedToast = screen.getByTestId('Saved');
      expect(savedToast).toHaveAttribute('data-limited');
      expect(screen.getByTestId('Other toast')).not.toHaveAttribute('data-limited');
    });

    it('recomputes limited toasts when the limit prop changes', async () => {
      function App(props: { limit: number }) {
        return (
          <Toast.Provider limit={props.limit}>
            <Toast.Viewport>
              <TestList />
            </Toast.Viewport>
          </Toast.Provider>
        );
      }

      // Port note: upstream's `setProps` becomes a signal write followed by a flush.
      const [limit, setLimit] = createSignal(1);
      await render(() => <App limit={limit()} />);

      const addButton = screen.getByRole('button', { name: 'add' });
      fireEvent.click(addButton);
      flush();
      fireEvent.click(addButton);
      flush();

      const toast1 = screen.getByTestId('toast-1');
      const toast2 = screen.getByTestId('toast-2');

      expect(toast2).not.toHaveAttribute('data-limited');
      expect(toast1).toHaveAttribute('data-limited');

      // Raising the limit un-limits the older toast.
      setLimit(2);
      await flushMicrotasks();
      expect(toast1).not.toHaveAttribute('data-limited');

      // Lowering it again re-limits it.
      setLimit(1);
      await flushMicrotasks();
      expect(toast1).toHaveAttribute('data-limited');
    });
  });

  describe('in dialog', () => {
    const { clock, render } = createRenderer();

    clock.withFakeTimers();

    function DialogToastExample() {
      const { add } = useToastManager();
      const [isOpen, setIsOpen] = createSignal(false);

      return (
        <>
          <button onClick={() => setIsOpen(true)}>open dialog</button>
          <Dialog.Root open={isOpen()} onOpenChange={(open) => setIsOpen(open)}>
            <Dialog.Portal>
              <Dialog.Backdrop />
              <Dialog.Popup>
                <button
                  onClick={() =>
                    add({
                      title: 'Toast in dialog',
                      description: 'This toast is in a dialog',
                    })
                  }
                >
                  add
                </button>
                <Dialog.Close />
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      );
    }

    function ToastInDialogList() {
      const toastManager = useToastManager();
      return (
        <For each={toastManager.toasts} keyed={(toast) => toast.id}>
          {(toast) => (
            <Toast.Root toast={toast()} data-testid="toast-root">
              <Toast.Title data-testid="toast-title">{toast().title}</Toast.Title>
              <Toast.Description data-testid="toast-description">
                {toast().description}
              </Toast.Description>
              <Toast.Close data-testid="toast-close" aria-label="close" />
            </Toast.Root>
          )}
        </For>
      );
    }

    it('toasts in dialogs are accessible and not aria-hidden', async () => {
      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <ToastInDialogList />
          </Toast.Viewport>
          <DialogToastExample />
        </Toast.Provider>
      ));

      const openDialogButton = screen.getByRole('button', { name: 'open dialog' });
      fireEvent.click(openDialogButton);
      flush();

      expect(screen.getByRole('dialog')).not.toBe(null);

      const addToastButton = screen.getByRole('button', { name: 'add' });
      fireEvent.click(addToastButton);
      flush();

      const toastRoot = screen.getByTestId('toast-root');
      expect(toastRoot).not.toBe(null);
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Toast in dialog');
      expect(screen.getByTestId('toast-description')).toHaveTextContent(
        'This toast is in a dialog',
      );
    });

    it('high priority toasts in dialogs have correct accessibility structure', async () => {
      function HighPriorityToastInDialog() {
        const { add } = useToastManager();
        return (
          <Dialog.Root open>
            <Dialog.Portal>
              <Dialog.Backdrop />
              <Dialog.Popup>
                <button
                  onClick={() => {
                    add({
                      title: 'High priority toast',
                      description: 'This is urgent',
                      priority: 'high',
                    });
                  }}
                >
                  add
                </button>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        );
      }

      await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <ToastInDialogList />
          </Toast.Viewport>
          <HighPriorityToastInDialog />
        </Toast.Provider>
      ));

      const addToastButton = screen.getByRole('button', { name: 'add' });
      fireEvent.click(addToastButton);
      flush();

      const toastRoot = screen.getByTestId('toast-root');
      expect(toastRoot).toHaveAttribute('aria-hidden', 'true');
      expect(screen.queryByRole('alert')).not.toBe(null);
    });
  });
});
