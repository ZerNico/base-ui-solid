import { expect, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { useRender } from '../use-render';
import type { IntrinsicTagName } from '../internals/types';
import { render } from '#test-utils';

// Port note: Solid can't clone elements, so upstream's `render={<button type="button" />}` element
// form becomes the `render="button"` tag-name form where the test is about something else.
// `className` is `class`.
describe('useRender', () => {
  it('render props does not overwrite className in a render function when unspecified', async () => {
    function TestComponent(props: { render: useRender.RenderProp<{}>; class?: string }) {
      const element = useRender({
        get render() {
          return props.render;
        },
        props: {
          get class() {
            return props.class;
          },
        },
      });
      return element;
    }

    const { container } = await render(() => (
      <TestComponent
        render={(props: any, state: any) => (
          <span {...props} class={`my-span ${props.class ?? ''}`} {...state} />
        )}
      />
    ));

    const element = container.firstElementChild;

    expect(element).toHaveAttribute('class', 'my-span ');
  });

  it('refs are handled as expected', async () => {
    // Port note: refs are Solid ref callbacks instead of React ref objects.
    const refs: Array<HTMLElement | undefined> = [];

    function TestComponent(props: { render: useRender.RenderProp<{}>; class?: string }) {
      const element = useRender({
        get render() {
          return props.render;
        },
        ref: [
          (node: HTMLElement) => {
            refs[0] = node;
          },
          (node: HTMLElement) => {
            refs[1] = node;
          },
        ],
        props: {
          get class() {
            return props.class;
          },
        },
      });
      return element;
    }

    const { container } = await render(() => (
      <TestComponent render={(props: any, state: any) => <span {...props} {...state} />} />
    ));
    expect(refs.length).toBe(2);

    refs.forEach((ref) => {
      expect(ref).toBe(container.firstElementChild);
    });
  });

  describe('param: defaultTagName', () => {
    it('renders div by default if no defaultTagName and no render params are provided', async () => {
      function TestComponent() {
        return useRender({});
      }

      const { container } = await render(() => <TestComponent />);
      expect(container.firstElementChild).toHaveProperty('tagName', 'DIV');
    });

    it('renders the element with the default tag with no render prop', async () => {
      function TestComponent(props: { defaultTagName: IntrinsicTagName }) {
        return useRender({
          get defaultTagName() {
            return props.defaultTagName;
          },
        });
      }

      const [defaultTagName, setDefaultTagName] = createSignal<IntrinsicTagName>('div');
      const { container } = await render(() => (
        <TestComponent defaultTagName={defaultTagName()} />
      ));
      expect(container.firstElementChild).toHaveProperty('tagName', 'DIV');

      setDefaultTagName('span');
      flush();
      expect(container.firstElementChild).toHaveProperty('tagName', 'SPAN');
    });

    it('is overwritten by the render prop', async () => {
      function TestComponent(props: {
        render: useRender.RenderProp<{}>;
        defaultTagName: IntrinsicTagName;
      }) {
        return useRender({
          get render() {
            return props.render;
          },
          get defaultTagName() {
            return props.defaultTagName;
          },
        });
      }

      const [defaultTagName, setDefaultTagName] = createSignal<IntrinsicTagName>('div');
      const { container } = await render(() => (
        <TestComponent defaultTagName={defaultTagName()} render="span" />
      ));
      expect(container.firstElementChild).toHaveProperty('tagName', 'SPAN');

      setDefaultTagName('a');
      flush();
      expect(container.firstElementChild).toHaveProperty('tagName', 'SPAN');
    });
  });

  describe('state to data attributes', () => {
    it('converts state to data attributes automatically', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'button',
          state: {
            active: true,
            index: 42,
          },
        });
        return element;
      }

      const { container } = await render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).toHaveAttribute('data-active', '');
      expect(button).toHaveAttribute('data-index', '42');
    });

    it('handles undefined values in state', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'div',
          state: {
            defined: 'value',
            notDefined: undefined,
          },
        });
        return element;
      }

      const { container } = await render(() => <TestComponent />);
      const div = container.firstElementChild;

      expect(div).toHaveAttribute('data-defined', 'value');
      expect(div).not.toHaveAttribute('data-notdefined');
    });

    it('merges state-based data attributes with existing props', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'button',
          state: {
            form: 'login',
          },
          props: {
            class: 'btn-primary',
            id: 'submit-btn',
            'data-existing': 'prop',
          },
        });
        return element;
      }

      const { container } = await render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).toHaveAttribute('data-form', 'login');

      expect(button).toHaveAttribute('class', 'btn-primary');
      expect(button).toHaveAttribute('id', 'submit-btn');

      expect(button).toHaveAttribute('data-existing', 'prop');
    });

    it('props override state-based data attributes', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'button',
          state: {
            active: true,
          },
          props: {
            'data-active': 'false',
          },
        });
        return element;
      }

      const { container } = await render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).toHaveAttribute('data-active', 'false');
    });

    it('handles empty state', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'span',
          state: {},
          props: {
            class: 'test-class',
          },
        });
        return element;
      }

      const { container } = await render(() => <TestComponent />);
      const span = container.firstElementChild;

      expect(span).toHaveAttribute('class', 'test-class');

      const attributeNames = Array.from(span?.attributes ?? [], (attr) => attr.name);
      expect(attributeNames.filter((name) => name.startsWith('data-'))).toEqual([]);
    });

    it('handles undefined state', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'div',
          state: undefined,
          props: {
            class: 'test-class',
            'data-from-props': 'value',
          },
        });
        return element;
      }

      const { container } = await render(() => <TestComponent />);
      const div = container.firstElementChild;

      expect(div).toHaveAttribute('class', 'test-class');
      expect(div).toHaveAttribute('data-from-props', 'value');
    });

    it('converts boolean values in state to data attributes', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'button',
          state: {
            active: true,
            disabled: false,
          },
        });
        return element;
      }

      const { container } = await render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).toHaveAttribute('data-active', '');
      expect(button).not.toHaveAttribute('data-disabled');
    });

    it('converts number values in state to data attributes', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'div',
          state: {
            count: 0,
            index: 42,
            percentage: 99.9,
          },
        });
        return element;
      }

      const { container } = await render(() => <TestComponent />);
      const div = container.firstElementChild;

      expect(div).not.toHaveAttribute('data-count');
      expect(div).toHaveAttribute('data-index', '42');
      expect(div).toHaveAttribute('data-percentage', '99.9');
    });

    it('supports custom stateAttributesMapping for kebab-case conversion', async () => {
      function TestComponent() {
        const element = useRender({
          render: 'button',
          state: {
            isActive: true,
            itemCount: 5,
            userName: 'John',
          },
          stateAttributesMapping: {
            isActive: (value) => (value ? { 'data-is-active': '' } : null),
            itemCount: (value) => ({ 'data-item-count': value.toString() }),
            userName: (value) => ({ 'data-user-name': value }),
          },
        });
        return element;
      }

      const { container } = await render(() => <TestComponent />);
      const button = container.firstElementChild;

      expect(button).toHaveAttribute('data-is-active', '');
      expect(button).toHaveAttribute('data-item-count', '5');
      expect(button).toHaveAttribute('data-user-name', 'John');
    });
  });
});
