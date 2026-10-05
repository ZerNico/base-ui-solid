import { For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { REPO_URL } from '../../../../../../../../config';
import styles from './index.module.css';

export default function ExampleNavigationMenu() {
  return (
    <NavigationMenu.Root class={styles.Root}>
      <NavigationMenu.List class={styles.List}>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger class={styles.Trigger}>
            Overview
            <NavigationMenu.Icon class={styles.Icon}>
              <CaretDownIcon />
            </NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content class={styles.Content}>
            <ul class={styles.GridLinkList}>
              <For each={overviewLinks}>
                {(item) => (
                  <li>
                    <Link class={styles.LinkCard} href={item.href}>
                      <h3 class={styles.LinkTitle}>{item.title}</h3>
                      <p class={styles.LinkDescription}>{item.description}</p>
                    </Link>
                  </li>
                )}
              </For>
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Trigger class={styles.Trigger}>
            Handbook
            <NavigationMenu.Icon class={styles.Icon}>
              <CaretDownIcon />
            </NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content class={styles.Content}>
            <ul class={styles.FlexLinkList}>
              <For each={handbookLinks}>
                {(item) => (
                  <li>
                    <Link class={styles.LinkCard} href={item.href}>
                      <h3 class={styles.LinkTitle}>{item.title}</h3>
                      <p class={styles.LinkDescription}>{item.description}</p>
                    </Link>
                  </li>
                )}
              </For>
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <Link class={styles.Trigger} href={REPO_URL}>
            GitHub
          </Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>

      <NavigationMenu.Portal>
        <NavigationMenu.Positioner
          class={styles.Positioner}
          sideOffset={10}
          collisionPadding={{ top: 5, bottom: 5, left: 20, right: 20 }}
          collisionAvoidance={{ side: 'none' }}
        >
          <NavigationMenu.Popup class={styles.Popup}>
            <NavigationMenu.Arrow class={styles.Arrow} />
            <NavigationMenu.Viewport class={styles.Viewport} />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}

function Link(props: NavigationMenu.Link.Props) {
  return (
    <NavigationMenu.Link
      render={
        // Use the `render` prop to render your framework's Link component
        // for client-side routing.
        // e.g. `<A href={props.href} />` from `@solidjs/router` instead of `'a'`.
        'a'
      }
      {...props}
    />
  );
}

function CaretDownIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="M12 6H4l4 4.5z" />
    </svg>
  );
}

const overviewLinks = [
  {
    href: '/solid/overview/quick-start',
    title: 'Quick Start',
    description: 'Install and assemble your first component.',
  },
  {
    href: '/solid/overview/accessibility',
    title: 'Accessibility',
    description: 'Learn how we build accessible components.',
  },
  {
    href: '/solid/overview/releases',
    title: 'Releases',
    description: 'See what’s new in the latest Base UI versions.',
  },
  {
    href: '/solid/overview/about',
    title: 'About',
    description: 'Learn more about Base UI and our mission.',
  },
] as const;

const handbookLinks = [
  {
    href: '/solid/handbook/styling',
    title: 'Styling',
    description:
      'Base UI components can be styled with plain CSS, Tailwind CSS, CSS-in-JS, or CSS Modules.',
  },
  {
    href: '/solid/handbook/animation',
    title: 'Animation',
    description:
      'Base UI components can be animated with CSS transitions, CSS animations, or JavaScript libraries.',
  },
  {
    href: '/solid/handbook/composition',
    title: 'Composition',
    description:
      'Base UI components can be replaced and composed with your own existing components.',
  },
] as const;
