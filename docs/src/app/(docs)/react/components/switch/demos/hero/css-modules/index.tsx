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
