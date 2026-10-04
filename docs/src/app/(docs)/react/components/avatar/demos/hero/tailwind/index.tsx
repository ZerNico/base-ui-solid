// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { Avatar } from 'base-ui-solid/avatar';

export default function ExampleAvatar() {
  return (
    <div class="flex gap-4">
      <Avatar.Root class="inline-flex size-8 items-center justify-center overflow-hidden rounded-full bg-neutral-200 align-middle text-sm leading-none font-normal text-neutral-950 select-none dark:bg-neutral-800 dark:text-white">
        <Avatar.Image
          src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=128&h=128&dpr=2&q=80"
          width="48"
          height="48"
          class="size-full object-cover"
        />
        <Avatar.Fallback delay={600} class="flex size-full items-center justify-center text-sm">
          LT
        </Avatar.Fallback>
      </Avatar.Root>
      <Avatar.Root class="inline-flex size-8 items-center justify-center overflow-hidden rounded-full bg-neutral-200 align-middle text-sm leading-none font-normal text-neutral-950 select-none dark:bg-neutral-800 dark:text-white">
        LT
      </Avatar.Root>
    </div>
  );
}
