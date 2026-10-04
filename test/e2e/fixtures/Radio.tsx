import { Radio } from 'base-ui-solid/radio';
import { RadioGroup } from 'base-ui-solid/radio-group';
import styles from './Radio.module.css';

export default function ExampleRadioGroup() {
  return (
    <RadioGroup aria-labelledby="apples-caption" defaultValue="fuji-apple" class={styles.Root}>
      <div class={styles.Caption} id="apples-caption">
        Best apple
      </div>

      <label class={styles.Label}>
        <Radio.Root data-testid="one" value="fuji-apple" class={styles.RadioRoot}>
          <Radio.Indicator class={styles.Indicator} />
        </Radio.Root>
        Fuji
      </label>

      <label class={styles.Label}>
        <Radio.Root data-testid="two" value="gala-apple" class={styles.RadioRoot}>
          <Radio.Indicator class={styles.Indicator} />
        </Radio.Root>
        Gala
      </label>

      <label class={styles.Label}>
        <Radio.Root data-testid="three" value="granny-smith-apple" class={styles.RadioRoot}>
          <Radio.Indicator class={styles.Indicator} />
        </Radio.Root>
        Granny Smith
      </label>
    </RadioGroup>
  );
}
