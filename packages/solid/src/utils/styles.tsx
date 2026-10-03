const DISABLE_SCROLLBAR_CLASS_NAME = 'base-ui-disable-scrollbar';

export const styleDisableScrollbar = {
  className: DISABLE_SCROLLBAR_CLASS_NAME,
  // Port note: upstream relies on React 19 hoisting and deduplicating `<style href precedence>`
  // into `<head>`. Solid has no resource hoisting, so the `<style>` element is rendered in place
  // (like upstream on React 18), without the React-only `href`/`precedence` attributes.
  getElement(nonce?: string) {
    return (
      <style nonce={nonce}>
        {`.${DISABLE_SCROLLBAR_CLASS_NAME}{scrollbar-width:none}.${DISABLE_SCROLLBAR_CLASS_NAME}::-webkit-scrollbar{display:none}`}
      </style>
    );
  },
};
