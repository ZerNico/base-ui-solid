import { omit } from 'solid-js';
import { useRender } from 'base-ui-solid/use-render';
import { mergeProps } from 'base-ui-solid/merge-props';
import styles from './index.module.css';

interface TextProps extends useRender.ComponentProps<'p'> {}

function Text(props: TextProps) {
  const otherProps = omit(props, 'render');

  const element = useRender({
    defaultTagName: 'p',
    get render() {
      return props.render;
    },
    props: () => mergeProps<useRender.ElementProps<'p'>>({ class: styles.Text }, otherProps),
  });

  return element;
}

export default function ExampleText() {
  return (
    <div>
      <Text>Text component rendered as a paragraph tag</Text>
      <Text render="strong">Text component rendered as a strong tag</Text>
    </div>
  );
}
