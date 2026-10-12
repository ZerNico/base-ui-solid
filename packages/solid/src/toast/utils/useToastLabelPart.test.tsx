import { createSignal, flush } from 'solid-js';
import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { expect, vi, describe, it } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { createRenderer, renderWithErrorBoundary, screen } from '#test-utils';
import { List, Button } from './test-utils';

interface LabelPartCase {
  name: string;
  Part: Component<any>;
  field: 'title' | 'description';
  attribute: string;
}

const cases: LabelPartCase[] = [
  { name: 'Toast.Title', Part: Toast.Title, field: 'title', attribute: 'aria-labelledby' },
  {
    name: 'Toast.Description',
    Part: Toast.Description,
    field: 'description',
    attribute: 'aria-describedby',
  },
];

describe('useToastLabelPart', () => {
  const { render } = createRenderer();

  describe.each(cases)('<$name />', ({ Part, field, attribute }) => {
    function renderInRoot(node: () => JSX.Element, toast: Toast.Root.ToastObject = { id: 'test' }) {
      return render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <Toast.Root toast={toast} data-testid="root">
              {node()}
            </Toast.Root>
          </Toast.Viewport>
        </Toast.Provider>
      ));
    }

    async function addToastFromManager() {
      const { user } = await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <List />
          </Toast.Viewport>
          <Button />
        </Toast.Provider>
      ));

      await user.click(screen.getByRole('button', { name: 'add' }));
    }

    it('throws a descriptive error when rendered outside <Toast.Root>', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await expect(
          renderWithErrorBoundary(render, () => (
            <Toast.Provider>
              <Toast.Viewport>
                <Part />
              </Toast.Viewport>
            </Toast.Provider>
          )),
        ).rejects.toThrow(
          'Base UI: ToastRootContext is missing. Toast parts must be used within <Toast.Root>.',
        );
      } finally {
        errorSpy.mockRestore();
      }
    });

    it(`renders the toast ${field} by default`, async () => {
      await addToastFromManager();

      expect(screen.getByTestId(field)).toHaveTextContent(field);
    });

    it(`adds ${attribute} to the root element`, async () => {
      await addToastFromManager();

      expect(screen.getByTestId('root')).toHaveAttribute(attribute, screen.getByTestId(field).id);
    });

    it('does not render if it has no children', async () => {
      function AddButton() {
        const { add } = Toast.useToastManager();
        return (
          <button type="button" onClick={() => add({ [field]: undefined })}>
            add
          </button>
        );
      }

      const { user } = await render(() => (
        <Toast.Provider>
          <Toast.Viewport>
            <List />
          </Toast.Viewport>
          <AddButton />
        </Toast.Provider>
      ));

      await user.click(screen.getByRole('button', { name: 'add' }));

      expect(screen.getByTestId('root')).not.toHaveAttribute(attribute);
      expect(screen.queryByTestId(field)).toBe(null);
    });

    it('renders a numeric zero child', async () => {
      await renderInRoot(() => <Part>{0}</Part>);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    // Port note: upstream's `render={<div>…</div>}` is a React element, render functions are
    // used instead.
    describe('prop: render', () => {
      it('renders content passed through the render prop', async () => {
        await renderInRoot(() => (
          <Part
            render={(props: JSX.HTMLAttributes<HTMLDivElement>) => (
              <div {...props}>render prop content</div>
            )}
          />
        ));

        expect(screen.getByText('render prop content')).toBeInTheDocument();
      });

      it('renders content passed through a render function', async () => {
        await renderInRoot(() => (
          <Part
            render={(props: JSX.HTMLAttributes<HTMLDivElement>) => <div {...props}>render fn</div>}
          />
        ));

        expect(screen.getByText('render fn')).toBeInTheDocument();
      });

      it(`wires ${attribute} to a part rendered through the render prop`, async () => {
        await renderInRoot(() => (
          <Part
            render={(props: JSX.HTMLAttributes<HTMLDivElement>) => (
              <div {...props}>render prop content</div>
            )}
          />
        ));

        expect(screen.getByTestId('root')).toHaveAttribute(
          attribute,
          screen.getByText('render prop content').id,
        );
      });

      it(`renders the toast ${field} through a childless render prop`, async () => {
        await renderInRoot(
          () => <Part render={(props: JSX.HTMLAttributes<HTMLDivElement>) => <div {...props} />} />,
          { id: 'test', [field]: 'Toast content' },
        );

        expect(screen.getByText('Toast content')).toBeInTheDocument();
      });

      it('does not render a childless render prop when there is no content', async () => {
        await renderInRoot(() => (
          <Part
            render={(props: JSX.HTMLAttributes<HTMLDivElement>) => (
              <div {...props} data-testid="part-render" />
            )}
          />
        ));

        expect(screen.queryByTestId('part-render')).toBe(null);
        expect(screen.getByTestId('root')).not.toHaveAttribute(attribute);
      });

      it('does not render when a render function returns no element', async () => {
        await renderInRoot(() => <Part data-testid="part-render" render={() => null} />);

        expect(screen.getByTestId('root')).toBeInTheDocument();
        expect(screen.queryByTestId('part-render')).toBe(null);
      });
    });

    it(`clears ${attribute} from the root when the content is removed`, async () => {
      function Fixture() {
        const [content, setContent] = createSignal<JSX.Element>('Toast content');
        return (
          <Toast.Provider>
            <Toast.Viewport>
              <Toast.Root toast={{ id: 'test' }} data-testid="root">
                <Part id="part">{content()}</Part>
              </Toast.Root>
            </Toast.Viewport>
            <button type="button" onClick={() => setContent(null)}>
              clear
            </button>
          </Toast.Provider>
        );
      }

      const { user } = await render(() => <Fixture />);

      const rootElement = screen.getByTestId('root');
      expect(rootElement).toHaveAttribute(attribute, 'part');

      await user.click(screen.getByRole('button', { name: 'clear' }));

      expect(screen.queryByText('Toast content')).toBe(null);
      expect(rootElement).not.toHaveAttribute(attribute);
    });

    it('does not let an older part cleanup clear a newer part', async () => {
      const [parts, setParts] = createSignal<'old' | 'both' | 'new'>('old');

      function Fixture(props: { parts: 'old' | 'both' | 'new' }) {
        return (
          <Toast.Provider>
            <Toast.Viewport>
              <Toast.Root toast={{ id: 'test' }} data-testid="root">
                {props.parts !== 'new' && <Part id="old-part">Old</Part>}
                {props.parts !== 'old' && <Part id="new-part">New</Part>}
              </Toast.Root>
            </Toast.Viewport>
          </Toast.Provider>
        );
      }

      await render(() => <Fixture parts={parts()} />);

      const root = screen.getByTestId('root');
      expect(root).toHaveAttribute(attribute, 'old-part');

      setParts('both');
      flush();
      expect(root).toHaveAttribute(attribute, 'new-part');

      setParts('new');
      flush();
      expect(root).toHaveAttribute(attribute, 'new-part');
    });
  });
});
