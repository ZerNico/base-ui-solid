import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useButton } from './useButton';

type ButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  disabled?: boolean | undefined;
};

export function NonNativeTestButton(props: ButtonProps) {
  const otherProps = omit(props, 'disabled');
  const { getButtonProps } = useButton({ disabled: () => props.disabled, native: () => false });

  return <span {...getButtonProps(otherProps)} />;
}

export function NativeTestButton(props: ButtonProps) {
  const otherProps = omit(props, 'disabled');
  const { getButtonProps } = useButton({ disabled: () => props.disabled });
  return <button {...getButtonProps(otherProps)} />;
}
