// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import type { JSX } from '@solidjs/web';
import { Toolbar } from 'base-ui-solid/toolbar';
import { ToggleGroup } from 'base-ui-solid/toggle-group';
import { Toggle } from 'base-ui-solid/toggle';
import { Select } from 'base-ui-solid/select';
import styles from './index.module.css';

export default function ExampleToolbar() {
  return (
    <Toolbar.Root class={styles.Toolbar}>
      <ToggleGroup class={styles.Group} aria-label="Alignment">
        <Toolbar.Button
          render={(props) => <Toggle {...props} style={props.style || undefined} />}
          aria-label="Align left"
          value="align-left"
          class={styles.Button}
        >
          Align Left
        </Toolbar.Button>
        <Toolbar.Button
          render={(props) => <Toggle {...props} style={props.style || undefined} />}
          aria-label="Align right"
          value="align-right"
          class={styles.Button}
        >
          Align Right
        </Toolbar.Button>
      </ToggleGroup>
      <Toolbar.Separator class={styles.Separator} />
      <Toolbar.Group class={styles.Group} aria-label="Numerical format">
        <Toolbar.Button class={styles.Button} aria-label="Format as currency">
          $
        </Toolbar.Button>
        <Toolbar.Button class={styles.Button} aria-label="Format as percent">
          %
        </Toolbar.Button>
      </Toolbar.Group>
      <Toolbar.Separator class={styles.Separator} />
      <Select.Root defaultValue="Helvetica">
        <Toolbar.Button
          render={(props) => <Select.Trigger {...props} style={props.style || undefined} />}
          class={styles.Button}
        >
          <Select.Value />
          <Select.Icon>
            <CaretUpDownIcon />
          </Select.Icon>
        </Toolbar.Button>
        <Select.Portal>
          <Select.Positioner class={styles.Positioner} sideOffset={4} alignItemWithTrigger={false}>
            <Select.Popup class={styles.Popup}>
              <Select.Item class={styles.Item} value="Helvetica">
                <Select.ItemIndicator class={styles.ItemIndicator}>
                  <CheckIcon />
                </Select.ItemIndicator>
                <Select.ItemText class={styles.ItemText}>Helvetica</Select.ItemText>
              </Select.Item>
              <Select.Item class={styles.Item} value="Arial">
                <Select.ItemIndicator class={styles.ItemIndicator}>
                  <CheckIcon />
                </Select.ItemIndicator>
                <Select.ItemText class={styles.ItemText}>Arial</Select.ItemText>
              </Select.Item>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <Toolbar.Separator class={styles.Separator} />
      <Toolbar.Link class={styles.Link} href="#">
        Edited 51m ago
      </Toolbar.Link>
    </Toolbar.Root>
  );
}

function CaretUpDownIcon(
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
      <path d="M11 10H5l3 3.5zm0-4H5l3-3.5z" />
    </svg>
  );
}

function CheckIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}
