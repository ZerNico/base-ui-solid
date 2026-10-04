import { For } from 'solid-js';
import { Slider } from 'base-ui-solid/slider';
import styles from './index.module.css';

const MIN = 0;
const MAX = 100;
const MARKS = [0, 25, 50, 75, 100];

export default function MarksSlider() {
  return (
    <Slider.Root class={styles.Root} defaultValue={40} min={MIN} max={MAX}>
      <Slider.Control class={styles.Control}>
        <Slider.Track class={styles.Track}>
          <Slider.Indicator class={styles.Indicator} />
          <For each={MARKS}>
            {(mark) => (
              <div
                aria-hidden="true"
                class={styles.Mark}
                style={{ left: `${valueToPercent(mark)}%` }}
              />
            )}
          </For>
          <Slider.Thumb aria-label="Volume" class={styles.Thumb} />
        </Slider.Track>
      </Slider.Control>
      <div class={styles.MarkLabels} aria-hidden="true">
        <For each={MARKS}>
          {(mark) => (
            <span class={styles.MarkLabel} style={{ left: `${valueToPercent(mark)}%` }}>
              {mark}
            </span>
          )}
        </For>
      </div>
    </Slider.Root>
  );
}

function valueToPercent(value: number) {
  return ((value - MIN) / (MAX - MIN)) * 100;
}
