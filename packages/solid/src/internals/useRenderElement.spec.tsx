import type { JSX } from '@solidjs/web';
// Port note: a reactive Solid render returns JSX.Element even when disabled; it updates in place.
import { expectType } from '#test-utils';
import { useRenderElement } from './useRenderElement';

const element1 = useRenderElement('div', {}, {});

expectType<JSX.Element, typeof element1>(element1);

const element2 = useRenderElement(
  'div',
  {},
  {
    enabled: true,
  },
);

expectType<JSX.Element, typeof element2>(element2);

const element3 = useRenderElement(
  'div',
  {},
  {
    enabled: false,
  },
);

expectType<JSX.Element, typeof element3>(element3);

const element4 = useRenderElement(
  'div',
  {},
  {
    enabled: Math.random() > 0.5,
  },
);

expectType<JSX.Element, typeof element4>(element4);
