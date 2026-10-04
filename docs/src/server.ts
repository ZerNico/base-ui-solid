import { provideRequestEvent } from '@solidjs/web/storage';
import { createStartHandler, defaultStreamHandler } from '@tanstack/solid-start-server';
import { legacyPath } from './mdx/legacyPaths.mjs';

// Port note: Solid Web rc.13 removed server-function helpers still imported by Start rc.8's
// server barrel. This static docs site uses Start's real SSR handler directly, with the same
// request-event scope, and has no server functions. Remove this entry when the barrel is fixed.
const handle = createStartHandler(defaultStreamHandler);
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const target = legacyPath(url.pathname);
    if (target) {
      return new Response(null, { status: 301, headers: { Location: target + url.search } });
    }
    const response = await provideRequestEvent({ request, locals: {} }, () => handle(request));
    if (response.status === 404) {
      // eslint-disable-next-line no-console -- Log missing request URLs without a warning flood.
      console.info(`[docs:not-found] ${request.method} ${request.url}`);
    }
    return response;
  },
};
