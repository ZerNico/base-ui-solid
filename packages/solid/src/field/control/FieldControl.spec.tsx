import { Field } from 'base-ui-solid/field';

function App() {
  // Port note: Solid forwards DOM refs as callbacks and custom renders as functions.
  const ref = (element: HTMLTextAreaElement) => {
    void element;
  };
  return <Field.Control ref={ref} render={(props) => <textarea {...props} />} />;
}

// Port note: the custom-control ref adaptation must still reject non-ref values.
// @ts-expect-error a numeric value is not a DOM ref
<Field.Control ref={42} />;
