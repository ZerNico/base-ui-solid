// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { Slider } from 'base-ui-solid/slider';

export default function RangeSlider() {
  return (
    <Slider.Root defaultValue={[25, 45]}>
      <Slider.Control class="flex w-56 touch-none items-center py-3 select-none">
        <Slider.Track class="h-1 w-full bg-neutral-200 select-none dark:bg-neutral-800">
          <Slider.Indicator class="bg-neutral-950 select-none dark:bg-white" />
          <Slider.Thumb
            index={0}
            aria-label="Minimum value"
            class="size-4 border border-neutral-950 bg-white select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-950 dark:has-[:focus-visible]:outline-white dark:border-white dark:bg-neutral-950"
          />
          <Slider.Thumb
            index={1}
            aria-label="Maximum value"
            class="size-4 border border-neutral-950 bg-white select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-950 dark:has-[:focus-visible]:outline-white dark:border-white dark:bg-neutral-950"
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
