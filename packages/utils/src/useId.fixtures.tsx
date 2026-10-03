import { useId } from '@base-ui-solid/utils/useId';

interface TestComponentProps {
  id?: string | undefined;
}

// Port note: `useId` returns a plain string in Solid, so a component that must follow a changing
// `id` prop reads it reactively and calls `useId` for the generated fallback only.
export function TestComponent(props: TestComponentProps) {
  const generatedId = useId();
  return <span data-testid="target" id={props.id ?? generatedId} />;
}

export function GeneratedIdComponent() {
  const id = useId();
  return <span data-testid="target" id={id} />;
}
