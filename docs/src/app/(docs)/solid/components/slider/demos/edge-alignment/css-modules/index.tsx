import { Slider } from 'base-ui-solid/slider';
import styles from './index.module.css';

export default function EdgeAlignedThumb() {
  return (
    <Slider.Root thumbAlignment="edge" defaultValue={25}>
      <Slider.Control class={styles.Control}>
        <Slider.Track class={styles.Track}>
          <Slider.Indicator class={styles.Indicator} />
          <Slider.Thumb aria-label="Volume" class={styles.Thumb} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
