// Port note: TanStack's root notFoundComponent replaces Next's global-not-found entry.
import Layout from './(website)/layout';
import { Link } from './(website)/Link';

export default function NotFoundPage() {
  return (
    <Layout>
      <section class="bui-d-c">
        <h1 class="Text sz-3 bp2:sz-4 bui-gcs-1 bui-gce-9 bp4:bui-gce-5">Page not found</h1>
        <div class="bui-gcs-1 bui-gce-9">
          <p class="Text sz-2">
            This page couldn't be found. Please return to the{' '}
            <Link href="/react/overview/quick-start">docs</Link> or create a corresponding issue on{' '}
            <Link href="https://github.com/mui/base-ui">GitHub</Link>.
          </p>
        </div>
      </section>
    </Layout>
  );
}
