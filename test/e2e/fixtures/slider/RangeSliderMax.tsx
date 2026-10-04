import { Slider } from 'base-ui-solid/slider';
import styles from './RangeSliderMax.module.css';

export default function RangeSliderMax() {
  return (
    <Slider.Root defaultValue={[100, 100]}>
      <Slider.Control class={styles.Control}>
        <Slider.Thumb index={0} class={styles.ThumbRed} />
        <Slider.Thumb index={1} class={styles.ThumbBlue} />
      </Slider.Control>
      <Slider.Value data-testid="output" />
    </Slider.Root>
  );
}
