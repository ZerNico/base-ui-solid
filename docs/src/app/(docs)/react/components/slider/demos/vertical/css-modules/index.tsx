// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { Slider } from 'base-ui-solid/slider';
import styles from './index.module.css';

export default function VerticalSlider() {
  return (
    <Slider.Root orientation="vertical" defaultValue={35}>
      <Slider.Control class={styles.Control}>
        <Slider.Track class={styles.Track}>
          <Slider.Indicator class={styles.Indicator} />
          <Slider.Thumb aria-label="Volume" class={styles.Thumb} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
