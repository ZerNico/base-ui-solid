import { describe, expect, it } from 'vitest';
import { adjustRefProp } from './solidPropAdjustments.mjs';

describe('adjustRefProp', () => {
  it('passes arrays to render functions as read-only arrays', () => {
    const prop = adjustRefProp({
      name: 'children',
      type: '((formattedValues: string[], values: number[]) => React.ReactNode) | null',
      default: '-',
      description: '-',
    });
    expect(prop.type).toBe(
      '((formattedValues: Accessor<readonly string[]>, values: Accessor<readonly number[]>) => JSX.Element) | null',
    );
  });

  it('upgrades existing array accessors and is idempotent', () => {
    const prop = {
      name: 'children',
      type: '((formattedValues: Accessor<string[]>, values: Accessor<number[]>) => JSX.Element) | null',
      default: '-',
      description: '-',
    };
    adjustRefProp(prop);
    const once = prop.type;
    adjustRefProp(prop);
    expect(prop.type).toBe(once);
    expect(once).toBe(
      '((formattedValues: Accessor<readonly string[]>, values: Accessor<readonly number[]>) => JSX.Element) | null',
    );
  });
});
