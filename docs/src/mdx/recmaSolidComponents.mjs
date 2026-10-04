// Port note: MDX's default HTML component map contains strings, which React accepts as
// components. Solid requires functions for member JSX tags, so wrap each default native tag.
export default function recmaSolidComponents() {
  return (tree) => {
    function walk(node) {
      if (!node || typeof node !== 'object') {
        return;
      }
      // MDX emits React attribute spellings even with a Solid jsxImportSource.
      if (node.type === 'JSXAttribute' && node.name.type === 'JSXIdentifier') {
        const nativeNames = { className: 'class', htmlFor: 'for', tabIndex: 'tabindex' };
        node.name.name = nativeNames[node.name.name] ?? node.name.name;
      }
      if (node.type === 'VariableDeclarator' && node.id?.name === '_components') {
        for (const property of node.init.properties) {
          if (property.type !== 'Property' || typeof property.value?.value !== 'string') {
            continue;
          }
          const tag = property.value.value;
          property.value = {
            type: 'ArrowFunctionExpression',
            params: [{ type: 'Identifier', name: 'nativeProps' }],
            expression: true,
            async: false,
            body: {
              type: 'JSXElement',
              openingElement: {
                type: 'JSXOpeningElement',
                name: { type: 'JSXIdentifier', name: tag },
                selfClosing: true,
                attributes: [
                  {
                    type: 'JSXSpreadAttribute',
                    argument: { type: 'Identifier', name: 'nativeProps' },
                  },
                ],
              },
              closingElement: null,
              children: [],
            },
          };
        }
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) {
          value.forEach(walk);
        } else if (value && typeof value === 'object') {
          walk(value);
        }
      }
    }
    walk(tree);
  };
}
