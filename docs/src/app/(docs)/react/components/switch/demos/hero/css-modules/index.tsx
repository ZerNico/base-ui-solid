// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { Switch } from 'base-ui-solid/switch';
import styles from './index.module.css';

export default function ExampleSwitch() {
  return (
    <label class={styles.Label}>
      <Switch.Root defaultChecked class={styles.Switch}>
        <Switch.Thumb class={styles.Thumb} />
      </Switch.Root>
      Notifications
    </label>
  );
}
