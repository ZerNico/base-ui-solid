import { Input } from 'base-ui-solid/input';

function App() {
  // Port note: Solid forwards DOM refs as callbacks and custom renders as functions.
  const ref = (element: HTMLTextAreaElement) => {
    void element;
  };
  return <Input ref={ref} render={(props) => <textarea {...props} />} />;
}
