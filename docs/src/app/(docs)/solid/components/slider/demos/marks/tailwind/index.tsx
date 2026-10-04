import { For } from 'solid-js';
import { Slider } from 'base-ui-solid/slider';

const MIN = 0;
const MAX = 100;
const MARKS = [0, 25, 50, 75, 100];

export default function MarksSlider() {
  return (
    <Slider.Root class="w-56" defaultValue={40} min={MIN} max={MAX}>
      <Slider.Control class="flex touch-none items-center py-2.5 select-none">
        <Slider.Track class="h-1 w-full bg-neutral-200 select-none dark:bg-neutral-800">
          <Slider.Indicator class="bg-neutral-950 select-none dark:bg-white" />
          <For each={MARKS}>
            {(mark) => (
              <div
                aria-hidden="true"
                class="absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-neutral-950 dark:bg-white"
                style={{ left: `${valueToPercent(mark)}%` }}
              />
            )}
          </For>
          <Slider.Thumb
            aria-label="Volume"
            class="size-4 border border-neutral-950 bg-white select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-950 dark:has-[:focus-visible]:outline-white dark:border-white dark:bg-neutral-950"
          />
        </Slider.Track>
      </Slider.Control>
      <div class="relative h-4 select-none" aria-hidden="true">
        <For each={MARKS}>
          {(mark) => (
            <span
              class="absolute -translate-x-1/2 text-xs whitespace-nowrap text-neutral-600 dark:text-neutral-400"
              style={{ left: `${valueToPercent(mark)}%` }}
            >
              {mark}
            </span>
          )}
        </For>
      </div>
    </Slider.Root>
  );
}

function valueToPercent(value: number) {
  return ((value - MIN) / (MAX - MIN)) * 100;
}
