import { createSignal, onSettled } from 'solid-js';

export function useInvalidFeedback() {
  const [focusedIndex, setFocusedIndex] = createSignal(0);
  const [invalidPulse, setInvalidPulse] = createSignal(0);
  const [statusMessage, setStatusMessage] = createSignal('');
  let invalidTimeout: ReturnType<typeof setTimeout> | null = null;
  let skipClearOnNextValueChange = false;

  onSettled(() => {
    return () => {
      if (invalidTimeout != null) {
        clearTimeout(invalidTimeout);
      }
    };
  });

  function clearInvalidFeedback() {
    if (invalidTimeout != null) {
      clearTimeout(invalidTimeout);
      invalidTimeout = null;
    }

    setInvalidPulse(0);
    setStatusMessage('');
  }

  function handleValueChange() {
    if (skipClearOnNextValueChange) {
      skipClearOnNextValueChange = false;
      return;
    }

    clearInvalidFeedback();
  }

  function handleValueInvalid(value: string) {
    skipClearOnNextValueChange = true;
    setInvalidPulse((current) => current + 1);
    setStatusMessage(`Unsupported characters were ignored from ${value}.`);

    if (invalidTimeout != null) {
      clearTimeout(invalidTimeout);
    }

    invalidTimeout = setTimeout(() => {
      invalidTimeout = null;
      setInvalidPulse(0);
    }, 400);
  }

  return {
    activeInvalidIndex: () => (invalidPulse() > 0 ? focusedIndex() : -1),
    invalidPulse,
    statusMessage,
    setFocusedIndex,
    handleValueChange,
    handleValueInvalid,
  };
}
