import { For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { useMediaQuery } from 'base-ui-solid/unstable-use-media-query';
import { REPO_URL } from '../../../../../../../../config';
import { audienceMenus, guideLinks, guidesPanel } from '../data';
import styles from './index.module.css';

export default function ExampleNavigationMenu() {
  const isDesktop = useMediaQuery(
    () => '(min-width: 700px)',
    () => ({ defaultMatches: true }),
  );

  return (
    <NavigationMenu.Root class={styles.Root}>
      <NavigationMenu.List class={styles.List}>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger class={styles.Trigger}>
            Product
            <NavigationMenu.Icon class={styles.Icon}>
              <CaretDownIcon />
            </NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content class={[styles.Content, styles.ProductContent]}>
            <NavigationMenu.Root
              class={styles.SubmenuRoot}
              orientation={isDesktop() ? 'vertical' : 'horizontal'}
              defaultValue="developers"
            >
              <div class={styles.SubmenuLayout}>
                <NavigationMenu.List class={styles.SubmenuList}>
                  <For each={audienceMenus}>
                    {(menu) => (
                      <NavigationMenu.Item value={menu.value}>
                        <NavigationMenu.Trigger class={styles.SubmenuTrigger}>
                          <span class={styles.SubmenuLabel}>{menu.label}</span>
                          <span class={styles.SubmenuHint}>{menu.hint}</span>
                        </NavigationMenu.Trigger>
                        <NavigationMenu.Content class={styles.SubmenuContent}>
                          <div>
                            <h4 class={styles.SubmenuTitle}>{menu.title}</h4>
                            <p class={styles.SubmenuDescription}>{menu.description}</p>
                          </div>
                          <ul class={styles.LinkList}>
                            <For each={menu.links}>
                              {(link) => (
                                <li>
                                  <Link class={styles.LinkCard} href={link.href}>
                                    <h5 class={styles.LinkTitle}>{link.title}</h5>
                                    <p class={styles.LinkDescription}>{link.description}</p>
                                  </Link>
                                </li>
                              )}
                            </For>
                          </ul>
                        </NavigationMenu.Content>
                      </NavigationMenu.Item>
                    )}
                  </For>
                </NavigationMenu.List>

                <NavigationMenu.Viewport class={styles.SubmenuViewport} />
              </div>
            </NavigationMenu.Root>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <NavigationMenu.Trigger class={styles.Trigger}>
            Learn
            <NavigationMenu.Icon class={styles.Icon}>
              <CaretDownIcon />
            </NavigationMenu.Icon>
          </NavigationMenu.Trigger>
          <NavigationMenu.Content class={[styles.Content, styles.GuidesContent]}>
            <div class={styles.GuidesPanel}>
              <div>
                <h4 class={styles.SubmenuTitle}>{guidesPanel.title}</h4>
                <p class={styles.SubmenuDescription}>{guidesPanel.description}</p>
              </div>
              <ul class={styles.LinkList}>
                <For each={guideLinks}>
                  {(link) => (
                    <li>
                      <Link class={styles.LinkCard} href={link.href}>
                        <h5 class={styles.LinkTitle}>{link.title}</h5>
                        <p class={styles.LinkDescription}>{link.description}</p>
                      </Link>
                    </li>
                  )}
                </For>
              </ul>
            </div>
          </NavigationMenu.Content>
        </NavigationMenu.Item>

        <NavigationMenu.Item>
          <Link class={styles.Trigger} href="/solid/overview/releases">
            Releases
          </Link>
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
        // e.g. `<NextLink href={props.href} />` instead of `<a />`.
        'a'
      }
      {...props}
    />
  );
}

function CaretDownIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="M12 6H4l4 4.5z" />
    </svg>
  );
}
