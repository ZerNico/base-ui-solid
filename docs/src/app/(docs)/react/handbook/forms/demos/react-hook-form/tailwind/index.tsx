// Port note: React Hook Form is React-only. This Solid controller demonstrates
import { For } from 'solid-js';
// the same controlled values, validation, touched/dirty flags, and submission.
import type { JSX } from '@solidjs/web';
import { createControlledForm, Controller } from '../../solid-controller';
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

interface FormValues {
  serverName: string;
  region: string | null;
  containerImage: string;
  serverType: string | null;
  numOfInstances: number | null;
  scalingThreshold: number[];
  storageType: 'ssd' | 'hdd';
  restartOnFailure: boolean;
  allowedNetworkProtocols: string[];
}

function ControlledForm() {
  const toastManager = useToastManager();

  const { control, handleSubmit } = createControlledForm<FormValues>({
    defaultValues: {
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
    <Form aria-label="Launch new cloud server" onSubmit={handleSubmit(submitForm)}>
      <Controller
        name="serverName"
        control={control}
        rules={{
          required: 'This field is required.',
          minlength: { value: 3, message: 'At least 3 characters.' },
        }}
        render={(model) => (
          <Field.Root
            name={model.field.name}
            invalid={model.fieldState.invalid}
            touched={model.fieldState.isTouched}
            dirty={model.fieldState.isDirty}
          >
            <Field.Label>Server name</Field.Label>
            <Field.Control
              ref={model.field.ref}
              value={model.field.value}
              onFocusOut={model.field.onFocusOut}
              onValueChange={model.field.onChange}
              placeholder="e.g. api-server-01"
            />
            <Field.Description>Must be 3 or more characters long</Field.Description>
            <Field.Error match={!!model.fieldState.error}>
              {model.fieldState.error?.message}
            </Field.Error>
          </Field.Root>
        )}
      />

      <Controller
        name="region"
        control={control}
        rules={{
          required: 'This field is required.',
        }}
        render={(model) => (
          <Field.Root
            name={model.field.name}
            invalid={model.fieldState.invalid}
            touched={model.fieldState.isTouched}
            dirty={model.fieldState.isDirty}
          >
            <Combobox.Root
              items={REGIONS}
              value={model.field.value}
              onValueChange={model.field.onChange}
            >
              <div class="relative text-sm leading-5 font-bold text-neutral-950 dark:text-white">
                <Field.Label class="mb-1 block">Region</Field.Label>
                <Combobox.InputGroup>
                  <Combobox.Input
                    placeholder="e.g. eu-central-1"
                    ref={model.field.ref}
                    onFocusOut={model.field.onFocusOut}
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
                      {(region: string) => {
                        return (
                          <Combobox.Item value={region}>
                            <Combobox.ItemIndicator>
                              <CheckIcon />
                            </Combobox.ItemIndicator>
                            <span class="col-start-2">{region}</span>
                          </Combobox.Item>
                        );
                      }}
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox.Root>
            <Field.Error match={!!model.fieldState.error}>
              {model.fieldState.error?.message}
            </Field.Error>
          </Field.Root>
        )}
      />

      <Controller
        name="containerImage"
        control={control}
        rules={{
          required: 'This field is required.',
        }}
        render={(model) => (
          <Field.Root
            name={model.field.name}
            invalid={model.fieldState.invalid}
            touched={model.fieldState.isTouched}
            dirty={model.fieldState.isDirty}
          >
            <Autocomplete.Root
              items={IMAGES}
              mode="both"
              itemToStringValue={(itemValue: Image) => itemValue.url}
              value={model.field.value}
              onValueChange={model.field.onChange}
            >
              <Field.Label>Container image</Field.Label>
              <Autocomplete.Input
                placeholder="e.g. docker.io/library/node:latest"
                ref={model.field.ref}
                onFocusOut={model.field.onFocusOut}
              />
              <Field.Description>Enter a registry URL with optional tags</Field.Description>
              <Autocomplete.Portal>
                <Autocomplete.Positioner>
                  <Autocomplete.Popup>
                    <Autocomplete.List>
                      {(image: Image) => {
                        return (
                          <Autocomplete.Item value={image}>
                            <span>{image.name}</span>
                            <span class="font-mono whitespace-nowrap text-xs opacity-80">
                              {image.url}
                            </span>
                          </Autocomplete.Item>
                        );
                      }}
                    </Autocomplete.List>
                  </Autocomplete.Popup>
                </Autocomplete.Positioner>
              </Autocomplete.Portal>
            </Autocomplete.Root>
            <Field.Error match={!!model.fieldState.error}>
              {model.fieldState.error?.message}
            </Field.Error>
          </Field.Root>
        )}
      />

      <Controller
        name="serverType"
        control={control}
        rules={{
          required: 'This field is required.',
        }}
        render={(model) => (
          <Field.Root
            name={model.field.name}
            invalid={model.fieldState.invalid}
            touched={model.fieldState.isTouched}
            dirty={model.fieldState.isDirty}
          >
            <Select.Root
              items={SERVER_TYPES}
              value={model.field.value}
              onValueChange={model.field.onChange}
              inputRef={model.field.ref}
            >
              <div class="w-fit space-y-1">
                <Select.Label>Server type</Select.Label>
                <Select.Trigger class="w-48" onFocusOut={model.field.onFocusOut}>
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
            <Field.Error match={!!model.fieldState.error}>
              {model.fieldState.error?.message}
            </Field.Error>
          </Field.Root>
        )}
      />

      <Controller
        name="numOfInstances"
        control={control}
        rules={{
          required: 'This field is required.',
        }}
        render={(model) => (
          <Field.Root
            name={model.field.name}
            invalid={model.fieldState.invalid}
            touched={model.fieldState.isTouched}
            dirty={model.fieldState.isDirty}
          >
            <NumberField.Root
              value={model.field.value}
              min={1}
              max={64}
              onValueChange={model.field.onChange}
            >
              <Field.Label>Number of instances</Field.Label>
              <NumberField.Group>
                <NumberField.Decrement>
                  <MinusIcon />
                </NumberField.Decrement>
                <NumberField.Input ref={model.field.ref} onFocusOut={model.field.onFocusOut} />
                <NumberField.Increment>
                  <PlusIcon />
                </NumberField.Increment>
              </NumberField.Group>
            </NumberField.Root>
            <Field.Error match={!!model.fieldState.error}>
              {model.fieldState.error?.message}
            </Field.Error>
          </Field.Root>
        )}
      />

      <Controller
        name="scalingThreshold"
        control={control}
        render={(model) => (
          <Field.Root
            name={model.field.name}
            invalid={model.fieldState.invalid}
            touched={model.fieldState.isTouched}
            dirty={model.fieldState.isDirty}
          >
            <Fieldset.Root
              render={(renderProps) => (
                <Slider.Root
                  value={model.field.value}
                  onValueChange={model.field.onChange}
                  onValueCommitted={model.field.onChange}
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
                    onFocusOut={model.field.onFocusOut}
                    inputRef={model.field.ref}
                  />
                  <Slider.Thumb
                    index={1}
                    aria-label="Maximum threshold"
                    onFocusOut={model.field.onFocusOut}
                  />
                </Slider.Track>
              </Slider.Control>
            </Fieldset.Root>
          </Field.Root>
        )}
      />

      <Controller
        name="storageType"
        control={control}
        render={(model) => (
          <Field.Root
            name={model.field.name}
            invalid={model.fieldState.invalid}
            touched={model.fieldState.isTouched}
            dirty={model.fieldState.isDirty}
          >
            <Fieldset.Root
              render={(renderProps) => (
                <RadioGroup
                  class="gap-4"
                  value={model.field.value}
                  onValueChange={model.field.onChange}
                  inputRef={model.field.ref}
                  {...(renderProps as any)}
                />
              )}
            >
              <Fieldset.Legend class="-mt-px">Storage type</Fieldset.Legend>
              <Field.Item>
                <Field.Label>
                  <Radio.Root value="ssd" onFocusOut={model.field.onFocusOut}>
                    <Radio.Indicator />
                  </Radio.Root>
                  SSD
                </Field.Label>
              </Field.Item>
              <Field.Item>
                <Field.Label>
                  <Radio.Root value="hdd" onFocusOut={model.field.onFocusOut}>
                    <Radio.Indicator />
                  </Radio.Root>
                  HDD
                </Field.Label>
              </Field.Item>
            </Fieldset.Root>
          </Field.Root>
        )}
      />

      <Controller
        name="restartOnFailure"
        control={control}
        render={(model) => (
          <Field.Root
            name={model.field.name}
            invalid={model.fieldState.invalid}
            touched={model.fieldState.isTouched}
            dirty={model.fieldState.isDirty}
          >
            <Field.Label class="gap-2">
              Restart on failure
              <Switch.Root
                checked={model.field.value}
                inputRef={model.field.ref}
                onCheckedChange={model.field.onChange}
                onFocusOut={model.field.onFocusOut}
              >
                <Switch.Thumb />
              </Switch.Root>
            </Field.Label>
          </Field.Root>
        )}
      />

      <Controller
        name="allowedNetworkProtocols"
        control={control}
        render={(model) => (
          <Field.Root
            name={model.field.name}
            invalid={model.fieldState.invalid}
            touched={model.fieldState.isTouched}
            dirty={model.fieldState.isDirty}
          >
            <Fieldset.Root
              render={(renderProps) => (
                <CheckboxGroup
                  value={model.field.value}
                  onValueChange={model.field.onChange}
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
                            inputRef={val === 'http' ? model.field.ref : undefined}
                            onFocusOut={model.field.onFocusOut}
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
      />

      <Button type="submit" class="mt-3">
        Launch server
      </Button>
    </Form>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ControlledForm />
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
