import { createSignal, onSettled } from 'solid-js';

export function useInvalidFeedback() {
  const [focusedIndex, setFocusedIndex] = createSignal(0);
  const [invalidPulse, setInvalidPulse] = createSignal(0);
  const [statusMessage, setStatusMessage] = createSignal('');
  const invalidTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
  const skipClearOnNextValueChangeRef = { current: false };

  onSettled(() => {
    return () => {
      if (invalidTimeoutRef.current != null) {
        clearTimeout(invalidTimeoutRef.current);
      }
    };
  });

  function clearInvalidFeedback() {
    if (invalidTimeoutRef.current != null) {
      clearTimeout(invalidTimeoutRef.current);
      invalidTimeoutRef.current = null;
    }

    setInvalidPulse(0);
    setStatusMessage('');
  }

  function handleValueChange() {
    if (skipClearOnNextValueChangeRef.current) {
      skipClearOnNextValueChangeRef.current = false;
      return;
    }

    clearInvalidFeedback();
  }

  function handleValueInvalid(value: string) {
    skipClearOnNextValueChangeRef.current = true;
    setInvalidPulse((current) => current + 1);
    setStatusMessage(`Unsupported characters were ignored from ${value}.`);

    if (invalidTimeoutRef.current != null) {
      clearTimeout(invalidTimeoutRef.current);
    }

    invalidTimeoutRef.current = setTimeout(() => {
      invalidTimeoutRef.current = null;
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
