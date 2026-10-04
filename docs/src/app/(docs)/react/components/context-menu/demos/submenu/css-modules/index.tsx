import { mergeProps } from 'base-ui-solid/merge-props';
import type { JSX } from '@solidjs/web';
import { ContextMenu } from 'base-ui-solid/context-menu';
import { Menu } from 'base-ui-solid/menu';
import styles from './index.module.css';

export default function ExampleContextMenu() {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger class={styles.Trigger}>Right click here</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner class={styles.Positioner}>
          <ContextMenu.Popup class={styles.Popup}>
            <ContextMenu.Item class={styles.Item}>Add to Library</ContextMenu.Item>

            <ContextMenu.SubmenuRoot>
              <ContextMenu.SubmenuTrigger class={styles.SubmenuTrigger}>
                Add to Playlist
                <CaretRightIcon />
              </ContextMenu.SubmenuTrigger>
              <ContextMenu.Portal>
                <ContextMenu.Positioner class={styles.Positioner} alignOffset={-4} sideOffset={-4}>
                  <ContextMenu.Popup class={styles.SubmenuPopup}>
                    <ContextMenu.Item class={styles.Item}>Get Up!</ContextMenu.Item>
                    <ContextMenu.Item class={styles.Item}>Inside Out</ContextMenu.Item>
                    <ContextMenu.Item class={styles.Item}>Night Beats</ContextMenu.Item>
                    <Menu.Separator class={styles.Separator} />
                    <ContextMenu.Item class={styles.Item}>New playlist…</ContextMenu.Item>
                  </ContextMenu.Popup>
                </ContextMenu.Positioner>
              </ContextMenu.Portal>
            </ContextMenu.SubmenuRoot>

            <ContextMenu.Separator class={styles.Separator} />
            <ContextMenu.Item class={styles.Item}>Play Next</ContextMenu.Item>
            <ContextMenu.Item class={styles.Item}>Play Last</ContextMenu.Item>
            <ContextMenu.Separator class={styles.Separator} />
            <ContextMenu.Item class={styles.Item}>Favorite</ContextMenu.Item>
            <ContextMenu.Item class={styles.Item}>Share</ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function CaretRightIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...(mergeProps<JSX.IntrinsicElements['svg']>(
        { style: { display: 'block' } },
        props,
      ) as JSX.IntrinsicElements['svg'])}
    >
      <path d="M6 12V4l4.5 4z" />
    </svg>
  );
}
