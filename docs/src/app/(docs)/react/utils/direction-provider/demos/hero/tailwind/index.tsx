// Port note: native Solid props, ref callbacks, and accessors replace React rendering.
import { Slider } from 'base-ui-solid/slider';
import { DirectionProvider } from 'base-ui-solid/direction-provider';

export default function ExampleDirectionProvider() {
  return (
    <div dir="rtl">
      <DirectionProvider direction="rtl">
        <Slider.Root defaultValue={25}>
          <Slider.Control class="flex w-56 touch-none items-center py-3 select-none">
            <Slider.Track class="h-1 w-full bg-neutral-200 select-none dark:bg-neutral-800">
              <Slider.Indicator class="bg-neutral-950 select-none dark:bg-white" />
              <Slider.Thumb
                aria-label="Volume"
                class="size-4 border border-neutral-950 bg-white select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-950 dark:has-[:focus-visible]:outline-white dark:border-white dark:bg-neutral-950"
              />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
      </DirectionProvider>
    </div>
  );
}
