import { flushMicrotasks } from './utils';
import type { Clock } from './createRenderer';

export async function advanceReactClock(clock: Clock, milliseconds: number) {
  await flushMicrotasks();
  await clock.tickAsync(milliseconds);
  await flushMicrotasks();
}
