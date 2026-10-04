import { createSignal, onSettled } from 'solid-js';
import type { JSX } from '@solidjs/web';

function TestViewer(props: { children: JSX.Element }) {
  // We're simulating `act(() => ReactDOM.render(children))`
  // In the end children passive effects should've been flushed.
  // React doesn't have any such guarantee outside of `act()` so we're approximating it.
  // Port note: Solid has no `act()` either. `onSettled` runs once the first render settled.
  const [ready, setReady] = createSignal(false);
  onSettled(() => {
    setReady(true);
  });

  // Port note: Solid removes an attribute set to `false`, so `aria-busy` is set as a string to
  // render `aria-busy="true"` like React.
  return (
    <div aria-busy={ready() ? 'false' : 'true'} data-testid="testcase">
      {props.children}
    </div>
  );
}

export default TestViewer;
