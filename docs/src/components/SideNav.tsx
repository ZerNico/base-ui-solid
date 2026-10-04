import type { JSX } from '@solidjs/web';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useLocation } from '@tanstack/solid-router';
import { ScrollArea } from 'base-ui-solid/scroll-area';
import './SideNav.css';
import { RouterLink } from './RouterLink';

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
  let item: HTMLLIElement | undefined;
  // Port note: native geometry implements upstream's nearest scrolling within this viewport.
  useEffect(
    () => {
      const viewport = item?.closest<HTMLElement>('[data-side-nav-viewport]');
      if (!item || !viewport || location().pathname !== props.href) {
        return;
      }
      const rect = item.getBoundingClientRect();
      const bounds = viewport.getBoundingClientRect();
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      if (rect.bottom > bounds.bottom) {
        viewport.scrollTop += rect.bottom - bounds.bottom + 7 * rem;
      } else if (rect.top < bounds.top) {
        viewport.scrollTop += rect.top - bounds.top + rem;
      }
    },
    () => [location().pathname, props.href],
  );
  return (
    <li
      class="SideNavItem"
      ref={(element) => {
        item = element;
      }}
    >
      <RouterLink
        class="SideNavLink"
        href={props.href}
        data-active={location().pathname === props.href || undefined}
        aria-current={location().pathname === props.href ? 'page' : undefined}
      >
        {props.children}
      </RouterLink>
    </li>
  );
}
