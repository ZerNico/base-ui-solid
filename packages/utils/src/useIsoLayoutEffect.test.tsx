import { describe, expect, it, vi } from 'vitest';
import { createRoot, createSignal, flush } from 'solid-js';
import { useIsoLayoutEffect } from './useIsoLayoutEffect';

// Port note: Solid's diagnostics treat an effect whose apply function declares no parameters as a
// measuring effect. These tests pin the shape `useIsoLayoutEffect` gives each kind of effect.
const applyArities = vi.hoisted<number[]>(() => []);

vi.mock('solid-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('solid-js')>();
  return {
    ...actual,
    createEffect: vi.fn((compute: any, apply: any, ...rest: any[]) => {
      applyArities.push(apply.length);
      return (actual.createEffect as any)(compute, apply, ...rest);
    }),
  };
});

describe('useIsoLayoutEffect', () => {
  it('passes the dependencies to an effect that is not measuring', () => {
    applyArities.length = 0;
    createRoot((dispose) => {
      useIsoLayoutEffect(
        () => {},
        () => [1],
      );
      dispose();
    });
    expect(applyArities).toEqual([1]);
  });

  it('gives a measuring effect an apply without parameters', () => {
    applyArities.length = 0;
    const effect = vi.fn();
    const [value, setValue] = createSignal(1);
    const dispose = createRoot((disposeRoot) => {
      useIsoLayoutEffect(effect, () => [value()] as const, { measuring: true });
      return disposeRoot;
    });
    flush();
    expect(applyArities).toEqual([0]);
    expect(effect).toHaveBeenLastCalledWith([1]);

    setValue(2);
    flush();
    expect(effect).toHaveBeenLastCalledWith([2]);
    dispose();
  });
});
