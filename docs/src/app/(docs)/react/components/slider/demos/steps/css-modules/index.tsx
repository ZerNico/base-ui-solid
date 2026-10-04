import { Slider } from 'base-ui-solid/slider';
import styles from './index.module.css';

export default function StepsSlider() {
  return (
    <Slider.Root
      class={styles.Root}
      defaultValue={400}
      min={100}
      max={900}
      step={100}
      largeStep={200}
    >
      <Slider.Label class={styles.Label}>Font weight</Slider.Label>
      <Slider.Value class={styles.Value} />
      <Slider.Control class={styles.Control}>
        <Slider.Track class={styles.Track}>
          <Slider.Indicator class={styles.Indicator} />
          <Slider.Thumb class={styles.Thumb} />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
