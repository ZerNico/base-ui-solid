// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { Slider } from 'base-ui-solid/slider';
import styles from './index.module.css';

export default function RangeSlider() {
  return (
    <Slider.Root defaultValue={[25, 45]}>
      <Slider.Control class={styles.Control}>
        <Slider.Track class={styles.Track}>
          <Slider.Indicator class={styles.Indicator} />
          <Slider.Thumb index={0} aria-label="Minimum value" class={styles.Thumb} />
          <Slider.Thumb index={1} aria-label="Maximum value" class={styles.Thumb} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
