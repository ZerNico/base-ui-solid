import { For } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Button } from '../../components/button';
import { CheckboxGroup } from '../../components/checkbox-group';
import { Form } from '../../components/form';
import { RadioGroup } from '../../components/radio-group';
import { ToastProvider, useToastManager } from '../../components/toast';
import * as Autocomplete from '../../components/autocomplete';
import * as Checkbox from '../../components/checkbox';
import * as Combobox from '../../components/combobox';
import * as Field from '../../components/field';
import * as Fieldset from '../../components/fieldset';
import * as NumberField from '../../components/number-field';
import * as Radio from '../../components/radio';
import * as Select from '../../components/select';
import * as Slider from '../../components/slider';
import * as Switch from '../../components/switch';
// A local stand-in mirroring `@formisch/solid` and `valibot` until they support Solid 2.0.
import { createForm, Field as FormField, handleSubmit, v } from '../../local-formisch';
import type { InferOutput } from '../../local-formisch';

const FormSchema = v.object({
  serverName: v.pipe(
    v.string(),
    v.nonEmpty('This field is required.'),
    v.minLength(3, 'At least 3 characters.'),
  ),
  region: v.string('This field is required.'),
  containerImage: v.pipe(v.string(), v.nonEmpty('This field is required.')),
  serverType: v.string('This field is required.'),
  numOfInstances: v.number('This field is required.'),
  scalingThreshold: v.array(v.number()),
  storageType: v.picklist(['ssd', 'hdd']),
  restartOnFailure: v.boolean(),
  allowedNetworkProtocols: v.array(v.string()),
});

type FormValues = InferOutput<typeof FormSchema>;

function FormischForm() {
  const toastManager = useToastManager();

  const form = createForm({
    schema: FormSchema,
    initialInput: {
      serverName: '',
      region: null,
      containerImage: '',
      serverType: null,
      numOfInstances: null,
      scalingThreshold: [0.2, 0.8],
      storageType: 'ssd',
      restartOnFailure: true,
      allowedNetworkProtocols: [],
    },
  });

  function submitForm(data: FormValues) {
    toastManager.add({
      title: 'Form submitted',
      description: 'The form contains these values:',
      data,
    });
  }

  return (
    <Form aria-label="Launch new cloud server" onSubmit={handleSubmit(form, submitForm)}>
      <FormField of={form} path={['serverName']}>
        {(field) => (
          <Field.Root
            name={field.props.name}
            invalid={!field.isValid}
            touched={field.isTouched}
            dirty={field.isDirty}
          >
            <Field.Label>Server name</Field.Label>
            <Field.Control
              ref={field.props.ref}
              value={field.input ?? ''}
              onFocus={field.props.onFocus}
              onBlur={field.props.onBlur}
              onValueChange={field.onInput}
              placeholder="e.g. api-server-01"
            />
            <Field.Description>Must be 3 or more characters long</Field.Description>
            <Field.Error match={!!field.errors}>{field.errors?.[0]}</Field.Error>
          </Field.Root>
        )}
      </FormField>

      <FormField of={form} path={['region']}>
        {(field) => (
          <Field.Root
            name={field.props.name}
            invalid={!field.isValid}
            touched={field.isTouched}
            dirty={field.isDirty}
          >
            <Combobox.Root items={REGIONS} value={field.input} onValueChange={field.onInput}>
              <div class="relative text-sm leading-5 font-bold text-neutral-950 dark:text-white">
                <Field.Label class="mb-1 block">Region</Field.Label>
                <Combobox.InputGroup>
                  <Combobox.Input
                    placeholder="e.g. eu-central-1"
                    ref={field.props.ref}
                    onFocus={field.props.onFocus}
                    onBlur={field.props.onBlur}
                  />
                  <div class="absolute right-0 bottom-0 inline-flex h-full items-center justify-center text-neutral-500 dark:text-neutral-400">
                    <Combobox.Clear />
                    <Combobox.Trigger>
                      <Combobox.CaretDownIcon />
                    </Combobox.Trigger>
                  </div>
                </Combobox.InputGroup>
              </div>
              <Combobox.Portal>
                <Combobox.Positioner>
                  <Combobox.Popup>
                    <Combobox.Empty>No matches</Combobox.Empty>
                    <Combobox.List>
                      {(region: Accessor<string>) => {
                        return (
                          <Combobox.Item value={region()}>
                            <Combobox.ItemIndicator>
                              <CheckIcon />
                            </Combobox.ItemIndicator>
                            <span class="col-start-2">{region()}</span>
                          </Combobox.Item>
                        );
                      }}
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox.Root>
            <Field.Error match={!!field.errors}>{field.errors?.[0]}</Field.Error>
          </Field.Root>
        )}
      </FormField>

      <FormField of={form} path={['containerImage']}>
        {(field) => (
          <Field.Root
            name={field.props.name}
            invalid={!field.isValid}
            touched={field.isTouched}
            dirty={field.isDirty}
          >
            <Autocomplete.Root
              items={IMAGES}
              mode="both"
              itemToStringValue={(itemValue: Image) => itemValue.url}
              value={field.input ?? ''}
              onValueChange={field.onInput}
            >
              <Field.Label>Container image</Field.Label>
              <Autocomplete.Input
                placeholder="e.g. docker.io/library/node:latest"
                ref={field.props.ref}
                onFocus={field.props.onFocus}
                onBlur={field.props.onBlur}
              />
              <Field.Description>Enter a registry URL with optional tags</Field.Description>
              <Autocomplete.Portal>
                <Autocomplete.Positioner>
                  <Autocomplete.Popup>
                    <Autocomplete.List>
                      {(image: Accessor<Image>) => {
                        return (
                          <Autocomplete.Item value={image()}>
                            <span>{image().name}</span>
                            <span class="font-mono whitespace-nowrap text-xs opacity-80">
                              {image().url}
                            </span>
                          </Autocomplete.Item>
                        );
                      }}
                    </Autocomplete.List>
                  </Autocomplete.Popup>
                </Autocomplete.Positioner>
              </Autocomplete.Portal>
            </Autocomplete.Root>
            <Field.Error match={!!field.errors}>{field.errors?.[0]}</Field.Error>
          </Field.Root>
        )}
      </FormField>

      <FormField of={form} path={['serverType']}>
        {(field) => (
          <Field.Root
            name={field.props.name}
            invalid={!field.isValid}
            touched={field.isTouched}
            dirty={field.isDirty}
          >
            <Select.Root
              items={SERVER_TYPES}
              value={field.input}
              onValueChange={field.onInput}
              inputRef={field.props.ref}
            >
              <div class="w-fit space-y-1">
                <Select.Label>Server type</Select.Label>
                <Select.Trigger
                  class="w-48"
                  onFocus={field.props.onFocus}
                  onBlur={field.props.onBlur}
                >
                  <Select.Value />
                  <Select.Icon>
                    <CaretUpDownIcon />
                  </Select.Icon>
                </Select.Trigger>
              </div>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup>
                    <Select.ScrollUpArrow />
                    <Select.List>
                      <For each={SERVER_TYPES}>
                        {({ label, value: serverType }) => {
                          return (
                            <Select.Item value={serverType}>
                              <Select.ItemIndicator>
                                <CheckIcon />
                              </Select.ItemIndicator>
                              <Select.ItemText>{label}</Select.ItemText>
                            </Select.Item>
                          );
                        }}
                      </For>
                    </Select.List>
                    <Select.ScrollDownArrow />
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
            <Field.Error match={!!field.errors}>{field.errors?.[0]}</Field.Error>
          </Field.Root>
        )}
      </FormField>

      <FormField of={form} path={['numOfInstances']}>
        {(field) => (
          <Field.Root
            name={field.props.name}
            invalid={!field.isValid}
            touched={field.isTouched}
            dirty={field.isDirty}
          >
            <NumberField.Root value={field.input} min={1} max={64} onValueChange={field.onInput}>
              <Field.Label>Number of instances</Field.Label>
              <NumberField.Group>
                <NumberField.Decrement>
                  <MinusIcon />
                </NumberField.Decrement>
                <NumberField.Input
                  ref={field.props.ref}
                  onFocus={field.props.onFocus}
                  onBlur={field.props.onBlur}
                />
                <NumberField.Increment>
                  <PlusIcon />
                </NumberField.Increment>
              </NumberField.Group>
            </NumberField.Root>
            <Field.Error match={!!field.errors}>{field.errors?.[0]}</Field.Error>
          </Field.Root>
        )}
      </FormField>

      <FormField of={form} path={['scalingThreshold']}>
        {(field) => (
          <Field.Root
            name={field.props.name}
            invalid={!field.isValid}
            touched={field.isTouched}
            dirty={field.isDirty}
          >
            <Fieldset.Root
              render={(renderProps) => (
                <Slider.Root
                  value={field.input}
                  onValueChange={field.onInput}
                  onValueCommitted={field.onInput}
                  thumbAlignment="edge"
                  min={0}
                  max={1}
                  step={0.01}
                  format={{
                    style: 'percent',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }}
                  class="w-full gap-y-2"
                  {...(renderProps as any)}
                />
              )}
            >
              <Fieldset.Legend>Scaling threshold</Fieldset.Legend>
              <Slider.Value class="col-start-2 text-end" />
              <Slider.Control>
                <Slider.Track>
                  <Slider.Indicator />
                  <Slider.Thumb
                    index={0}
                    aria-label="Minimum threshold"
                    onFocus={field.props.onFocus}
                    onBlur={field.props.onBlur}
                    inputRef={field.props.ref}
                  />
                  <Slider.Thumb
                    index={1}
                    aria-label="Maximum threshold"
                    onFocus={field.props.onFocus}
                    onBlur={field.props.onBlur}
                  />
                </Slider.Track>
              </Slider.Control>
            </Fieldset.Root>
          </Field.Root>
        )}
      </FormField>

      <FormField of={form} path={['storageType']}>
        {(field) => (
          <Field.Root
            name={field.props.name}
            invalid={!field.isValid}
            touched={field.isTouched}
            dirty={field.isDirty}
          >
            <Fieldset.Root
              render={(renderProps) => (
                <RadioGroup
                  class="gap-4"
                  value={field.input}
                  onValueChange={field.onInput}
                  inputRef={field.props.ref}
                  {...(renderProps as any)}
                />
              )}
            >
              <Fieldset.Legend class="-mt-px">Storage type</Fieldset.Legend>
              <Field.Item>
                <Field.Label>
                  <Radio.Root value="ssd" onFocus={field.props.onFocus} onBlur={field.props.onBlur}>
                    <Radio.Indicator />
                  </Radio.Root>
                  SSD
                </Field.Label>
              </Field.Item>
              <Field.Item>
                <Field.Label>
                  <Radio.Root value="hdd" onFocus={field.props.onFocus} onBlur={field.props.onBlur}>
                    <Radio.Indicator />
                  </Radio.Root>
                  HDD
                </Field.Label>
              </Field.Item>
            </Fieldset.Root>
          </Field.Root>
        )}
      </FormField>

      <FormField of={form} path={['restartOnFailure']}>
        {(field) => (
          <Field.Root
            name={field.props.name}
            invalid={!field.isValid}
            touched={field.isTouched}
            dirty={field.isDirty}
          >
            <Field.Label class="gap-2">
              Restart on failure
              <Switch.Root
                checked={field.input ?? false}
                inputRef={field.props.ref}
                onCheckedChange={field.onInput}
                onFocus={field.props.onFocus}
                onBlur={field.props.onBlur}
              >
                <Switch.Thumb />
              </Switch.Root>
            </Field.Label>
          </Field.Root>
        )}
      </FormField>

      <FormField of={form} path={['allowedNetworkProtocols']}>
        {(field) => (
          <Field.Root
            name={field.props.name}
            invalid={!field.isValid}
            touched={field.isTouched}
            dirty={field.isDirty}
          >
            <Fieldset.Root
              render={(renderProps) => (
                <CheckboxGroup
                  value={field.input}
                  onValueChange={field.onInput}
                  {...(renderProps as any)}
                />
              )}
            >
              <Fieldset.Legend class="mb-2">Allowed network protocols</Fieldset.Legend>
              <div class="flex gap-4">
                <For each={['http', 'https', 'ssh']}>
                  {(val) => {
                    return (
                      <Field.Item>
                        <Field.Label class="uppercase">
                          <Checkbox.Root
                            value={val}
                            inputRef={val === 'http' ? field.props.ref : undefined}
                            onFocus={field.props.onFocus}
                            onBlur={field.props.onBlur}
                          >
                            <Checkbox.Indicator>
                              <CheckIcon />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          {val}
                        </Field.Label>
                      </Field.Item>
                    );
                  }}
                </For>
              </div>
            </Fieldset.Root>
          </Field.Root>
        )}
      </FormField>

      <Button type="submit" class="mt-3">
        Launch server
      </Button>
    </Form>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <FormischForm />
    </ToastProvider>
  );
}

function CaretUpDownIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={props.style}
    >
      <path d="M11 10H5l3 3.5zm0-4H5l3-3.5z" />
    </svg>
  );
}

function CheckIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={props.style}
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}

function PlusIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-linecap="square"
      stroke-linejoin="round"
      {...props}
      style={props.style}
    >
      <path d="M1.5 8h13M8 14.5v-13" />
    </svg>
  );
}

function MinusIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-linecap="square"
      stroke-linejoin="round"
      {...props}
      style={props.style}
    >
      <path d="M1.5 8h13" />
    </svg>
  );
}

function cartesian<T extends string[][]>(...arrays: T): string[][] {
  return arrays.reduce<string[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
    [[]],
  );
}

const REGIONS = cartesian(['us', 'eu', 'ap'], ['central', 'east', 'west'], ['1', '2', '3']).map(
  (part) => part.join('-'),
);

interface Image {
  url: string;
  name: string;
}
/* prettier-ignore */
const IMAGES: Image[] = ['nginx:1.29-alpine', 'node:22-slim', 'postgres:18', 'redis:8.2.2-alpine'].map((name) => ({
  url: `docker.io/library/${name}`,
  name,
}));

const SERVER_TYPES = [
  { label: 'Select server type', value: null },
  ...cartesian(['t', 'm'], ['1', '2'], ['small', 'medium', 'large']).map((part) => {
    const value = part.join('.').replace('.', '');
    return { label: value, value };
  }),
];
