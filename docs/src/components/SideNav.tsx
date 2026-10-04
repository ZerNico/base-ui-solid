import type { JSX } from '@solidjs/web';
import { useLocation } from '@tanstack/solid-router';
import { ScrollArea } from 'base-ui-solid/scroll-area';
import './SideNav.css';

export function Root(props: JSX.IntrinsicElements['div']) {
  return (
    <nav aria-label="Main navigation" class="SideNavRoot">
      <ScrollArea.Root>
        <ScrollArea.Viewport data-side-nav-viewport class="SideNavViewport">
          {props.children}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar class="SideNavScrollbar" orientation="vertical">
          <ScrollArea.Thumb class="SideNavScrollbarThumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </nav>
  );
}
export function Section(props: JSX.IntrinsicElements['div']) {
  return <div {...props} class={['SideNavSection', props.class]} />;
}
export function Heading(props: JSX.IntrinsicElements['div']) {
  return <div {...props} class={['SideNavHeading', props.class]} />;
}
export function List(props: JSX.IntrinsicElements['ul']) {
  return <ul {...props} class={['SideNavList', props.class]} />;
}
export function Item(props: { href: string; children?: JSX.Element }) {
  const location = useLocation();
  return (
    <li class="SideNavItem">
      <a
        class="SideNavLink"
        href={props.href}
        data-active={location().pathname === props.href || undefined}
        aria-current={location().pathname === props.href ? 'page' : undefined}
      >
        {props.children}
      </a>
    </li>
  );
}
