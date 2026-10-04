import { useErrorSearchParams } from './useErrorSearchParams';
// Port note: Solid Router supplies query parameters on server and client.
export default function ErrorCode() {
  const params = useErrorSearchParams();
  return <div style={{ display: 'contents' }}>{params().get('code') ?? ''}</div>;
}
