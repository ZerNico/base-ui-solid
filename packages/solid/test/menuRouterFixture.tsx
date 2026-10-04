import { createContext, createSignal, useContext, Show, omit, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';

// Port note: React Router is React-only; exercise the same client-link behavior with a Solid fixture.
const Router = createContext<{ pathname: Accessor<string>; navigate: (path: string) => void }>();
export function MemoryRouter(props: { initialEntries: string[]; children?: JSX.Element }) {
  const [pathname, navigate] = createSignal(untrack(() => props.initialEntries[0]));
  return <Router value={{ pathname, navigate }}>{props.children}</Router>;
}
export function Routes(props: { children?: JSX.Element }) {
  return <>{props.children}</>;
}
export function Route(props: { path: string; element: JSX.Element }) {
  const router = useContext(Router);
  return <Show when={router.pathname() === props.path}>{props.element}</Show>;
}
export function useLocation() {
  const router = useContext(Router);
  return {
    get pathname() {
      return router.pathname();
    },
  };
}
export function Link(props: JSX.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  const router = useContext(Router);
  const elementProps = omit(props, 'to', 'onClick');
  return (
    <a
      {...elementProps}
      href={props.to}
      onClick={(event) => {
        const onClick = props.onClick;
        if (typeof onClick === 'function') {
          onClick(event);
        }
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          !event.shiftKey
        ) {
          event.preventDefault();
          router.navigate(props.to);
        }
      }}
    />
  );
}
