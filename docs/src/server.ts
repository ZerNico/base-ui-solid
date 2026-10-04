import { provideRequestEvent } from '@solidjs/web/storage';
import { createStartHandler, defaultStreamHandler } from '@tanstack/solid-start-server';

// Port note: Solid Web rc.13 removed server-function helpers still imported by Start rc.8's
// server barrel. This static docs site uses Start's real SSR handler directly, with the same
// request-event scope, and has no server functions. Remove this entry when the barrel is fixed.
const handle = createStartHandler(defaultStreamHandler);
export default {
  fetch(request: Request) {
    return provideRequestEvent({ request, locals: {} }, () => handle(request));
  },
};
