import type { JSX } from '@solidjs/web';
import { Menu } from 'base-ui-solid/menu';
import styles from './index.module.css';

export default function ExampleMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger class={styles.Button}>
        Song <CaretDownIcon />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner class={styles.Positioner} sideOffset={8} align="start">
          <Menu.Popup class={styles.Popup}>
            <Menu.Item class={styles.Item}>Add to Library</Menu.Item>

            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger class={styles.SubmenuTrigger}>
                Add to Playlist
                <CaretRightIcon />
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner
                  class={styles.Positioner}
                  sideOffset={getOffset}
                  alignOffset={getOffset}
                >
                  <Menu.Popup class={styles.Popup}>
                    <Menu.Item class={styles.Item}>Get Up!</Menu.Item>
                    <Menu.Item class={styles.Item}>Inside Out</Menu.Item>
                    <Menu.Item class={styles.Item}>Night Beats</Menu.Item>
                    <Menu.Separator class={styles.Separator} />
                    <Menu.Item class={styles.Item}>New playlist…</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>

            <Menu.Separator class={styles.Separator} />
            <Menu.Item class={styles.Item}>Play Next</Menu.Item>
            <Menu.Item class={styles.Item}>Play Last</Menu.Item>
            <Menu.Separator class={styles.Separator} />
            <Menu.Item class={styles.Item}>Favorite</Menu.Item>
            <Menu.Item class={styles.Item}>Share</Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function getOffset({ side }: { side: Menu.Positioner.Props['side'] }) {
  return side === 'top' || side === 'bottom' ? 4 : -4;
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

function CaretRightIcon(
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
      <path d="M6 12V4l4.5 4z" />
    </svg>
  );
}
