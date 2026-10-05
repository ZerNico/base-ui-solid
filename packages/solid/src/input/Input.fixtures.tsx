import type { JSX } from '@solidjs/web';
import { Input } from '.';

function TextInput(props: JSX.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function InputDefaultValueApp(props: {
  variant: 'default' | 'tag' | 'function' | 'component';
}) {
  const render = () => {
    switch (props.variant) {
      case 'tag':
        return 'input' as const;
      case 'function':
        return (renderProps: JSX.InputHTMLAttributes<HTMLInputElement>) => (
          <input {...renderProps} />
        );
      case 'component':
        return TextInput;
      default:
        return undefined;
    }
  };
  return <Input data-testid="input" defaultValue="Alice" render={render()} />;
}
