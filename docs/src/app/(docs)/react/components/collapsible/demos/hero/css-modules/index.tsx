// Port note: Solid uses class and its native SVG props; the icon has no React style spread.
import type { JSX } from '@solidjs/web';
import { Collapsible } from 'base-ui-solid/collapsible';
import styles from './index.module.css';

export default function ExampleCollapsible() {
  return (
    <Collapsible.Root class={styles.Collapsible}>
      <Collapsible.Trigger class={styles.Trigger}>
        Recovery keys
        <CaretRightIcon class={styles.Icon} />
      </Collapsible.Trigger>
      <Collapsible.Panel class={styles.Panel}>
        <div class={styles.Content}>
          <div>alien-bean-pasta</div>
          <div>wild-irish-burrito</div>
          <div>horse-battery-staple</div>
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

export function CaretRightIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: 'block' }}
    >
      <path d="M6 12V4l4.5 4z" />
    </svg>
  );
}
