import { createSignal } from 'solid-js';
import { ToastRootContext } from '../root/ToastRootContext';
import { ToastTitle } from '../title/ToastTitle';
import { ToastDescription } from '../description/ToastDescription';
import { ToastAction } from '../action/ToastAction';

// Port note: server/client fixture for custom render output, including Solid fragments.
export function CustomToastParts(props: {
  empty?: boolean | undefined;
  fragment?: boolean | undefined;
}) {
  const [titleId, setTitleId] = createSignal<string>();
  const [descriptionId, setDescriptionId] = createSignal<string>();
  const context: ToastRootContext = {
    toast: () => ({ id: 'test' }),
    setTitleId,
    setDescriptionId,
    visibleIndex: () => 0,
    expanded: () => false,
    recalculateHeight: () => {},
  };
  return (
    <ToastRootContext value={context}>
      <div data-testid="root" aria-labelledby={titleId()} aria-describedby={descriptionId()}>
        <ToastTitle
          render={(attributes) =>
            props.fragment ? (
              <>
                <h2 {...attributes}>{props.empty ? '' : 'title'}</h2>
              </>
            ) : (
              <h2 {...attributes}>{props.empty ? '' : 'title'}</h2>
            )
          }
        />
        <ToastDescription
          render={(attributes) =>
            props.fragment ? (
              <>
                <p {...attributes}>{props.empty ? '' : 'description'}</p>
              </>
            ) : (
              <p {...attributes}>{props.empty ? '' : 'description'}</p>
            )
          }
        />
        <ToastAction
          render={(attributes) =>
            props.fragment ? (
              <>
                <button {...attributes}>{props.empty ? '' : 'action'}</button>
              </>
            ) : (
              <button {...attributes}>{props.empty ? '' : 'action'}</button>
            )
          }
        />
      </div>
    </ToastRootContext>
  );
}
