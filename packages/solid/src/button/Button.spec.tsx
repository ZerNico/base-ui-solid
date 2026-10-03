import { Button } from 'base-ui-solid/button';

<Button />;
<Button type="submit" form="form-id" name="action" />;

// Port note: `render={<span />}` (React element) is unsupported; a tag name is used instead.
<Button nativeButton={false} render="span" />;
<Button nativeButton={false} render={(props) => <div {...props} />} />;
<Button nativeButton={false} disabled render="span" />;

<Button nativeButton={false} type="submit" />;
