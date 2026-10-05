import type { JSX } from '@solidjs/web';
// Port note: a reactive Solid render returns JSX.Element even when disabled; it updates in place.
import { expectType } from '#test-utils';
import { useRender } from './useRender';
import { Button } from '../button';

const element1 = useRender({
  render: () => <div>Test</div>,
});

expectType<JSX.Element, typeof element1>(element1);

const element2 = useRender({
  render: () => <div>Test</div>,
  enabled: true,
});

expectType<JSX.Element, typeof element2>(element2);

const element3 = useRender({
  render: () => <div>Test</div>,
  enabled: false,
});

expectType<JSX.Element, typeof element3>(element3);

const element4 = useRender({
  render: () => <div>Test</div>,
  enabled: Math.random() > 0.5,
});

expectType<JSX.Element, typeof element4>(element4);

const element5 = useRender({
  render: () => <button type="button">Click</button>,
});

expectType<JSX.Element, typeof element5>(element5);

const element6 = useRender({
  // Port note: React-element render props become Solid render functions.
  render: () => <div />,
});

expectType<JSX.Element, typeof element6>(element6);

const element7 = useRender({
  render: () => <button type="button" aria-label="Submit" />,
  props: {
    class: 'btn-primary',
    onClick: () => console.log('clicked'),
  },
});

expectType<JSX.Element, typeof element7>(element7);

function App() {
  // Port note: compose Solid renders through a function rather than a cloned React element.
  return (
    <Button
      nativeButton={false}
      render={(props) => useRender({ defaultTagName: 'div', props: () => ({ ...props }) })}
    />
  );
}

// Port note: element props allow `data-*` attributes in object literals, like JSX attributes.
const elementProps: useRender.ElementProps<'button'> = {
  type: 'button',
  'data-active': '',
  'data-index': 1,
  'data-open': true,
};
expectType<useRender.ElementProps<'button'>, typeof elementProps>(elementProps);
const invalidElementProps: useRender.ElementProps<'button'> = {
  // @ts-expect-error - not an attribute
  notAnAttribute: true,
};
void invalidElementProps;
