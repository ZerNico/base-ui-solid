import { For } from 'solid-js';
import { Menu } from 'base-ui-solid/menu';
import styles from '../../_index.module.css';
import transitionStyles from './index.module.css';

type MenuContent = {
  heading: string;
  groups: string[][];
};
const MENUS = {
  library: {
    heading: 'Library',
    groups: [
      ['Add to library', 'Add to favorites'],
      ['Create playlist', 'Create station'],
    ],
  },
  playback: {
    heading: 'Playback',
    groups: [
      ['Play now', 'Add to queue'],
      ['Play next', 'Play last', 'Sleep timer'],
    ],
  },
  share: {
    heading: 'Share',
    groups: [
      ['Copy link', 'Copy embed code'],
      ['Share to contacts', 'Share to social'],
    ],
  },
} as const satisfies Record<string, MenuContent>;
type MenuKey = keyof typeof MENUS;
const demoMenu = Menu.createHandle<MenuKey>();
export default function MenuDetachedTriggersFullDemo() {
  return (
    <div class={styles.Container}>
      <Menu.Trigger class={styles.Button} handle={demoMenu} payload={'library' as const}>
        Library
      </Menu.Trigger>
      <Menu.Trigger class={styles.Button} handle={demoMenu} payload={'playback' as const}>
        Playback
      </Menu.Trigger>
      <Menu.Trigger class={styles.Button} handle={demoMenu} payload={'share' as const}>
        Share
      </Menu.Trigger>

      <Menu.Root handle={demoMenu} modal={false}>
        {({ payload }) => (
          <Menu.Portal>
            <Menu.Positioner
              sideOffset={8}
              align="start"
              class={[styles.Positioner, transitionStyles.Positioner]}
            >
              <Menu.Popup class={[styles.Popup, transitionStyles.Popup]}>
                <Menu.Viewport class={transitionStyles.Viewport}>
                  {payload() &&
                    MENUS[payload()!].groups.map((group, groupIndex) => [
                      <Menu.Group>
                        {groupIndex === 0 && (
                          <Menu.GroupLabel class={styles.Label}>
                            {MENUS[payload()!].heading}
                          </Menu.GroupLabel>
                        )}
                        <For each={group}>
                          {(item) => <Menu.Item class={styles.Item}>{item}</Menu.Item>}
                        </For>
                      </Menu.Group>,
                      groupIndex < MENUS[payload()!].groups.length - 1 && (
                        <Menu.Separator class={styles.Separator} />
                      ),
                    ])}
                </Menu.Viewport>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        )}
      </Menu.Root>
    </div>
  );
}
