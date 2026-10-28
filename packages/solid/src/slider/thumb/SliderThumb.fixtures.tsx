import { Slider } from '..';

export function SingleThumbSlider(props: { thumbAlignment?: 'edge' | undefined }) {
  return (
    <Slider.Root
      defaultValue={30}
      thumbAlignment={props.thumbAlignment}
      style={{
        width: '100px',
      }}
    >
      <Slider.Value />
      <Slider.Control>
        <Slider.Track>
          <Slider.Indicator />
          <Slider.Thumb data-testid="thumb" />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

export function RangeThumbsSlider(props: { thumbAlignment?: 'edge' | undefined }) {
  return (
    <Slider.Root
      defaultValue={[30, 40]}
      thumbAlignment={props.thumbAlignment}
      style={{
        width: '100px',
      }}
    >
      <Slider.Value />
      <Slider.Control>
        <Slider.Track>
          <Slider.Thumb index={0} data-testid="thumb" />
          <Slider.Thumb index={1} data-testid="thumb" />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

export function FormattedSliderThumb(props: {
  defaultValue: number;
  max: number;
  format: Intl.NumberFormatOptions;
}) {
  return (
    <Slider.Root defaultValue={props.defaultValue} max={props.max} format={props.format}>
      <Slider.Control>
        <Slider.Thumb />
      </Slider.Control>
    </Slider.Root>
  );
}
