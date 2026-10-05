import { Checkbox } from 'base-ui-solid/checkbox';
import { CheckboxGroup } from 'base-ui-solid/checkbox-group';
import { Field } from 'base-ui-solid/field';
import { Fieldset } from 'base-ui-solid/fieldset';
import { Form } from 'base-ui-solid/form';
import { Radio } from 'base-ui-solid/radio';
import { RadioGroup } from 'base-ui-solid/radio-group';
import { Slider } from 'base-ui-solid/slider';
import { Button } from 'base-ui-solid/button';

// Port note: type regressions, absent upstream. The Forms handbook renders groups through
// `<Fieldset.Root render>`: the render function's props (Solid's `style` includes `false`) must be
// accepted by the components they're spread on.

<Form>
  <Field.Root>
    <Fieldset.Root render={(props) => <Slider.Root {...props} />}>
      <Fieldset.Legend>Price range</Fieldset.Legend>
      <Slider.Control>
        <Slider.Track>
          <Slider.Thumb aria-label="Minimum price" />
          <Slider.Thumb aria-label="Maximum price" />
        </Slider.Track>
      </Slider.Control>
    </Fieldset.Root>
  </Field.Root>

  <Field.Root>
    <Fieldset.Root render={(props) => <RadioGroup {...props} />}>
      <Fieldset.Legend>Storage type</Fieldset.Legend>
      <Radio.Root value="ssd" />
      <Radio.Root value="hdd" />
    </Fieldset.Root>
  </Field.Root>

  <Field.Root>
    <Fieldset.Root render={(props) => <CheckboxGroup {...props} />}>
      <Fieldset.Legend>Backup schedule</Fieldset.Legend>
      <Field.Item>
        <Checkbox.Root value="daily" />
        <Field.Label>Daily</Field.Label>
      </Field.Item>
    </Fieldset.Root>
  </Field.Root>
</Form>;

// Solid's `style={false}` removes the style, like on intrinsic elements.
<Button style={false} />;
<Button style={(state) => (state.disabled ? false : { color: 'red' })} />;
