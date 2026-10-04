import { Separator } from 'base-ui-solid/separator';

export default function ExampleSeparator() {
  return (
    <div class="flex gap-4 text-nowrap">
      <a
        href="#"
        class="text-sm text-neutral-950 decoration-neutral-300 decoration-1 underline-offset-2 hover:underline focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:text-white dark:decoration-neutral-700"
      >
        Home
      </a>
      <a
        href="#"
        class="text-sm text-neutral-950 decoration-neutral-300 decoration-1 underline-offset-2 hover:underline focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:text-white dark:decoration-neutral-700"
      >
        Pricing
      </a>
      <a
        href="#"
        class="text-sm text-neutral-950 decoration-neutral-300 decoration-1 underline-offset-2 hover:underline focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:text-white dark:decoration-neutral-700"
      >
        Blog
      </a>
      <a
        href="#"
        class="text-sm text-neutral-950 decoration-neutral-300 decoration-1 underline-offset-2 hover:underline focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:text-white dark:decoration-neutral-700"
      >
        Support
      </a>

      <Separator orientation="vertical" class="w-px bg-neutral-300 dark:bg-neutral-700" />

      <a
        href="#"
        class="text-sm text-neutral-950 decoration-neutral-300 decoration-1 underline-offset-2 hover:underline focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:text-white dark:decoration-neutral-700"
      >
        Log in
      </a>
      <a
        href="#"
        class="text-sm text-neutral-950 decoration-neutral-300 decoration-1 underline-offset-2 hover:underline focus-visible:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white dark:text-white dark:decoration-neutral-700"
      >
        Sign up
      </a>
    </div>
  );
}
