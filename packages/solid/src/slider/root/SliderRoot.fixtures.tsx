import { Slider } from '..';

export function LabelTestCase() {
  return (
    <Slider.Root defaultValue={30} data-testid="root">
      <Slider.Label data-testid="label">Volume</Slider.Label>
      <Slider.Control>
        <Slider.Track>
          <Slider.Thumb />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
