import { Slider } from 'base-ui-solid/slider';
import styles from './Range.module.css';

export default function RangeSlider() {
  return (
    <Slider.Root defaultValue={[25, 30]}>
      <Slider.Control class={styles.Control}>
        <Slider.Thumb index={0} class={styles.ThumbRed} />
        <Slider.Thumb index={1} class={styles.ThumbBlue} />
      </Slider.Control>
      <Slider.Value data-testid="output" />
    </Slider.Root>
  );
}
