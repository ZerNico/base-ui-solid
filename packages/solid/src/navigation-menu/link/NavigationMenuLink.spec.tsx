import type { JSX } from '@solidjs/web';
import { expectType } from '#test-utils';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';

// `NavigationMenu.Link` exposes the native `<a>` props in its `render` callback.
<NavigationMenu.Link
  render={(props) => {
    // Port note: Solid's native href also accepts serializable attribute values and removal sentinels.
    expectType<JSX.IntrinsicElements['a']['href'], typeof props.href>(props.href);
    return <a {...props} />;
  }}
/>;
