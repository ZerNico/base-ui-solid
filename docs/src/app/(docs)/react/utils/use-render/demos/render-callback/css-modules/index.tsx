// Port note: native Solid props, ref callbacks, and accessors replace React rendering.
import { createSignal, createMemo, omit } from 'solid-js';
import { useRender } from 'base-ui-solid/use-render';
import { mergeProps } from 'base-ui-solid/merge-props';
import styles from './index.module.css';

interface CounterState {
  odd: boolean;
}

interface CounterProps extends useRender.ComponentProps<'button', CounterState> {}

function Counter(props: CounterProps) {
  const otherProps = omit(props, 'render');

  const [count, setCount] = createSignal(0);
  const odd = () => count() % 2 === 1;
  const state = createMemo(() => ({ odd: odd() }));

  const defaultProps: useRender.ElementProps<'button'> = {
    class: styles.Button,
    type: 'button',
    children: (
      <div style={{ display: 'contents' }}>
        Counter: <span class={styles.count}>{count()}</span>
      </div>
    ),
    onClick() {
      setCount((prev) => prev + 1);
    },
    get 'aria-label'() {
      return `Count is ${count()}, click to increase.`;
    },
  };

  const element = useRender({
    defaultTagName: 'button',
    get render() {
      return props.render;
    },
    state,
    props: () => mergeProps(defaultProps, otherProps),
  });

  return element;
}

export default function ExampleCounter() {
  return (
    <Counter
      render={(props, state) => (
        <button {...props}>
          {props.children}
          <span class={styles.suffix}>{state.odd ? '👎' : '👍'}</span>
        </button>
      )}
    />
  );
}
