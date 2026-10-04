import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useToastProviderContext } from './provider/ToastProviderContext';
import type { ToastPositionerProps } from './positioner/ToastPositioner';

/**
 * Returns the array of toasts and methods to manage them.
 *
 * Port note: `toasts` is a getter that reads the store reactively: read it in a reactive scope
 * (JSX, a memo or an effect) and don't destructure it. The methods are stable.
 */
export function useToastManager<Data extends object = any>(): UseToastManagerReturnValue<Data> {
  const store = useToastProviderContext();

  const toasts = store.useState('toasts');

  return {
    get toasts() {
      return toasts();
    },
    add: store.addToast,
    close: store.closeToast,
    update: store.updateToast,
    promise: store.promiseToast,
  };
}

export interface ToastObject<Data extends object> {
  /**
   * The unique identifier for the toast.
   */
  id: string;
  /**
   * The ref for the toast.
   */
  ref?: RefObject<HTMLElement | null> | undefined;
  /**
   * The title of the toast.
   */
  title?: JSX.Element | undefined;
  /**
   * The type of the toast. Used to conditionally style the toast,
   * including conditionally rendering elements based on the type.
   */
  type?: string | undefined;
  /**
   * The description of the toast.
   */
  description?: JSX.Element | undefined;
  /**
   * The amount of time (in ms) before the toast is auto dismissed.
   * A value of `0` will prevent the toast from being dismissed automatically.
   * @default 5000
   */
  timeout?: number | undefined;
  /**
   * The priority of the toast.
   * - `low` - The toast will be announced politely.
   * - `high` - The toast will be announced urgently.
   * @default 'low'
   */
  priority?: 'low' | 'high' | undefined;
  /**
   * The transition status of the toast.
   */
  transitionStatus?: 'starting' | 'ending' | undefined;
  /**
   * A counter that increments whenever the toast is updated or upserted.
   */
  updateKey?: number | undefined;
  /**
   * Determines if the toast was limited because the toast limit was exceeded.
   */
  limited?: boolean | undefined;
  /**
   * The height of the toast.
   */
  height?: number | undefined;
  /**
   * Callback function to be called when the toast is closed.
   */
  onClose?: (() => void) | undefined;
  /**
   * Callback function to be called when the toast is removed from the list after any animations are complete when closed.
   */
  onRemove?: (() => void) | undefined;
  /**
   * The props for the action button.
   */
  actionProps?: Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> | undefined;
  /**
   * The props forwarded to the toast positioner element when rendering anchored toasts.
   */
  positionerProps?: ToastManagerPositionerProps | undefined;
  /**
   * Custom data for the toast.
   */
  data?: Data | undefined;
}

export interface ToastManagerPositionerProps extends Omit<
  ToastPositionerProps,
  'anchor' | 'toast'
> {
  /**
   * An element to position the toast against.
   */
  anchor?: Element | null | undefined;
}

export interface UseToastManagerReturnValue<Data extends object = any> {
  toasts: ToastObject<Data>[];
  add: <T extends Data = Data>(options: ToastManagerAddOptions<T>) => string;
  close: (toastId?: string) => void;
  update: <T extends Data = Data>(
    toastId: string,
    options:
      ToastManagerUpdateOptions<T> | ((prevToast: ToastObject<T>) => ToastManagerUpdateOptions<T>),
  ) => void;
  promise: <Value, T extends Data = Data>(
    promise: Promise<Value>,
    options: ToastManagerPromiseOptions<Value, T>,
  ) => Promise<Value>;
}

export interface ToastManagerAddOptions<Data extends object> extends Omit<
  ToastObject<Data>,
  'id' | 'animation' | 'height' | 'ref' | 'limited' | 'updateKey'
> {
  /**
   * The unique identifier for the toast. Adding a toast with an existing ID
   * updates it in place and refreshes its auto-dismiss timer.
   */
  id?: string | undefined;
}

export interface ToastManagerUpdateOptions<Data extends object> extends Partial<
  Omit<ToastObject<Data>, 'id' | 'ref' | 'height' | 'transitionStatus' | 'limited' | 'updateKey'>
> {}

export interface ToastManagerPromiseOptions<Value, Data extends object> {
  loading: string | ToastManagerUpdateOptions<Data>;
  success:
    | string
    | ToastManagerUpdateOptions<Data>
    | ((result: Value) => string | ToastManagerUpdateOptions<Data>);
  error:
    | string
    | ToastManagerUpdateOptions<Data>
    | ((error: any) => string | ToastManagerUpdateOptions<Data>);
}
