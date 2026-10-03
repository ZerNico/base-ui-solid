import type { JSX } from '@solidjs/web';
import { expectType } from '#test-utils';
import { Toolbar } from 'base-ui-solid/toolbar';

// `Toolbar.Link` exposes the native `<a>` props in its `render` callback.
// Port note: Solid types `href` as `string | SerializableAttributeValue | RemoveAttribute`
// (`RemoveAttribute` is `undefined | false`) instead of React's `string | undefined`.
<Toolbar.Link
  render={(props) => {
    expectType<JSX.AnchorHTMLAttributes<HTMLAnchorElement>['href'], typeof props.href>(props.href);
    return <a {...props} />;
  }}
/>;
