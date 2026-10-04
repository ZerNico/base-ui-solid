import { Slider } from 'base-ui-solid/slider';
import styles from './Inset.module.css';

export default function InsetSlider() {
  return (
    <Slider.Root thumbAlignment="edge" defaultValue={30}>
      <Slider.Control class={styles.Control}>
        <Slider.Thumb data-testid="thumb" class={styles.Thumb} />
      </Slider.Control>
      <Slider.Value data-testid="output" />
    </Slider.Root>
  );
}
