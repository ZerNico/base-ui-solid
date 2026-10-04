// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createUniqueId } from 'solid-js';
import { Radio } from 'base-ui-solid/radio';
import { RadioGroup } from 'base-ui-solid/radio-group';
import styles from './index.module.css';

export default function ExampleRadioGroup() {
  const id = createUniqueId();
  return (
    <RadioGroup aria-labelledby={id} defaultValue="fuji-apple" class={styles.RadioGroup}>
      <div class={styles.Caption} id={id}>
        Best apple
      </div>

      <label class={styles.Item}>
        <Radio.Root value="fuji-apple" class={styles.Radio}>
          <Radio.Indicator class={styles.Indicator} />
        </Radio.Root>
        Fuji
      </label>

      <label class={styles.Item}>
        <Radio.Root value="gala-apple" class={styles.Radio}>
          <Radio.Indicator class={styles.Indicator} />
        </Radio.Root>
        Gala
      </label>

      <label class={styles.Item}>
        <Radio.Root value="granny-smith-apple" class={styles.Radio}>
          <Radio.Indicator class={styles.Indicator} />
        </Radio.Root>
        Granny Smith
      </label>
    </RadioGroup>
  );
}
