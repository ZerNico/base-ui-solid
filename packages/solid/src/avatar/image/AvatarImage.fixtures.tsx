import { Avatar } from '..';

export function AvatarImageFixture(props: {
  src: string;
  alt: string;
  keepMounted?: boolean | undefined;
}) {
  return (
    <Avatar.Root>
      <Avatar.Image
        data-testid="image"
        keepMounted={props.keepMounted}
        src={props.src}
        alt={props.alt}
      />
      <Avatar.Fallback>JD</Avatar.Fallback>
    </Avatar.Root>
  );
}
