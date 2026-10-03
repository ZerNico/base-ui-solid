import type { JSX } from '@solidjs/web';
import { expectType } from '#test-utils';
import { Avatar } from 'base-ui-solid/avatar';
import type { ImageLoadingStatus } from 'base-ui-solid/avatar';

// Port note: Solid's attribute types (lowercase names, values that may be `RemoveAttribute`).
type ImgSrc = JSX.ImgHTMLAttributes<HTMLImageElement>['src'];
type ImgAlt = JSX.ImgHTMLAttributes<HTMLImageElement>['alt'];

// `Avatar.Image` accepts and forwards the native responsive/loading `<img>` props.
<Avatar.Root
  render={(props, state) => {
    expectType<ImageLoadingStatus, typeof state.imageLoadingStatus>(state.imageLoadingStatus);
    return <span {...props} />;
  }}
>
  <Avatar.Image
    crossorigin="anonymous"
    keepMounted
    referrerpolicy="no-referrer"
    sizes="48px"
    srcset="avatar.png 1x, avatar@2x.png 2x"
    onLoadingStatusChange={(status) => {
      expectType<ImageLoadingStatus, typeof status>(status);
    }}
    render={(props, state) => {
      expectType<ImgSrc, typeof props.src>(props.src);
      expectType<ImgAlt, typeof props.alt>(props.alt);
      expectType<ImageLoadingStatus, typeof state.imageLoadingStatus>(state.imageLoadingStatus);
      return <img alt="" {...props} />;
    }}
  />
  <Avatar.Fallback
    delay={100}
    render={(props, state) => {
      expectType<ImageLoadingStatus, typeof state.imageLoadingStatus>(state.imageLoadingStatus);
      return <span {...props} />;
    }}
  />
</Avatar.Root>;
