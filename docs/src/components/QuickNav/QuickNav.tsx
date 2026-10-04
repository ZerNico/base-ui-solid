import { omit } from 'solid-js';

import type { JSX } from '@solidjs/web';
import { ScrollArea } from 'base-ui-solid/scroll-area';
import './QuickNav.css';

// Port note: keep lazy children out of reactive prop spreads so their reads have their own scope.

export function Container(props: JSX.IntrinsicElements['div']) {
  return (
    <div {...omit(props, 'children')} class={['QuickNavContainer', props.class]}>
      {props.children}
    </div>
  );
}
export function Content(props: JSX.IntrinsicElements['div']) {
  return (
    <div {...omit(props, 'children')} class={['QuickNavContent', props.class]}>
      {props.children}
    </div>
  );
}
export function Root(props: JSX.IntrinsicElements['div']) {
  return (
    <nav aria-label="On this page" class={['QuickNavRoot', props.class]}>
      <div class="QuickNavInner">
        <ScrollArea.Root>
          <ScrollArea.Viewport class="QuickNavViewport">{props.children}</ScrollArea.Viewport>
          <ScrollArea.Scrollbar class="QuickNavScrollbar" orientation="vertical">
            <ScrollArea.Thumb class="QuickNavScrollbarThumb" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>
    </nav>
  );
}
export function Title(props: JSX.IntrinsicElements['header']) {
  return (
    <header {...omit(props, 'children')} class={['bui-sr-only', props.class]}>
      {props.children}
    </header>
  );
}
// Port note: render the list once; reading lazy JSX children in a Show condition allocates
// hydration ids before the list's scope and causes an SSR/client mismatch in Solid 2.0.
export function List(props: JSX.IntrinsicElements['ul']) {
  return (
    <ul {...omit(props, 'children')} class={['QuickNavList', props.class]}>
      {props.children}
    </ul>
  );
}
export function Item(props: JSX.IntrinsicElements['li']) {
  return (
    <li {...omit(props, 'children')} class={['QuickNavItem', props.class]}>
      {props.children}
    </li>
  );
}
// Port note: browser anchors handle fragment navigation; the upstream analytics provider is React-only.
export function Link(props: JSX.IntrinsicElements['a']) {
  return (
    <a {...omit(props, 'children')} class={['QuickNavLink', props.class]}>
      {props.children}
    </a>
  );
}
