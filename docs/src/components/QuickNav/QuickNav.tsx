import type { JSX } from '@solidjs/web';
import { ScrollArea } from 'base-ui-solid/scroll-area';
import './QuickNav.css';

export function Container(props: JSX.IntrinsicElements['div']) {
  return <div {...props} class={['QuickNavContainer', props.class]} />;
}
export function Content(props: JSX.IntrinsicElements['div']) {
  return <div {...props} class={['QuickNavContent', props.class]} />;
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
  return <header {...props} class={['bui-sr-only', props.class]} />;
}
// Port note: render the list once; reading lazy JSX children in a Show condition allocates
// hydration ids before the list's scope and causes an SSR/client mismatch in Solid 2.0.
export function List(props: JSX.IntrinsicElements['ul']) {
  return <ul {...props} class={['QuickNavList', props.class]} />;
}
export function Item(props: JSX.IntrinsicElements['li']) {
  return <li {...props} class={['QuickNavItem', props.class]} />;
}
// Port note: browser anchors handle fragment navigation; the upstream analytics provider is React-only.
export function Link(props: JSX.IntrinsicElements['a']) {
  return <a {...props} class={['QuickNavLink', props.class]} />;
}
