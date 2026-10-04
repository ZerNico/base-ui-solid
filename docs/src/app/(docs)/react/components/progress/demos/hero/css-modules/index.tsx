// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createSignal, onSettled } from 'solid-js';
import { Progress } from 'base-ui-solid/progress';
import styles from './index.module.css';

export default function ExampleProgress() {
  const [value, setValue] = createSignal(20);

  // Simulate changes
  onSettled(() => {
    const interval = setInterval(() => {
      setValue((current) => Math.min(100, Math.round(current + Math.random() * 25)));
    }, 1000);
    return () => clearInterval(interval);
  });

  return (
    <Progress.Root class={styles.Progress} value={value()}>
      <Progress.Label class={styles.Label}>Export data</Progress.Label>
      <Progress.Value class={styles.Value} />
      <Progress.Track class={styles.Track}>
        <Progress.Indicator class={styles.Indicator} />
      </Progress.Track>
    </Progress.Root>
  );
}
