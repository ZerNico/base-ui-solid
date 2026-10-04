import type { JSX } from '@solidjs/web';
import { expectType } from '#test-utils';
import { PreviewCard } from 'base-ui-solid/preview-card';

// `PreviewCard.Trigger` exposes the native `<a>` props in its `render` callback.
// Port note: Solid types `href` as `string | SerializableAttributeValue | RemoveAttribute`
// (`RemoveAttribute` is `undefined | false`) instead of React's `string | undefined`.
<PreviewCard.Trigger
  render={(props) => {
    expectType<JSX.AnchorHTMLAttributes<HTMLAnchorElement>['href'], typeof props.href>(props.href);
    return <a {...props} />;
  }}
/>;
