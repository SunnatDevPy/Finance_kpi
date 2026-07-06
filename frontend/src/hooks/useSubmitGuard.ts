import { useRef, useState } from "react";

/**
 * Guards an async handler (form submit, action button) against duplicate
 * double-fire calls — double-click, double Enter, or the UI freezing for a
 * moment while a request is still in flight. Wrap the handler with `guard(...)`
 * and use `submitting` to disable the trigger control / show a spinner.
 *
 * The `inFlight` ref check happens synchronously (before React state updates
 * flush), so it also blocks a second call fired within the same tick —
 * something a `disabled` prop alone cannot guarantee.
 */
export function useSubmitGuard() {
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  function guard<Args extends unknown[]>(
    fn: (...args: Args) => Promise<void> | void,
  ): (...args: Args) => Promise<void> {
    return async (...args: Args) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setSubmitting(true);
      try {
        await fn(...args);
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    };
  }

  return { submitting, guard };
}
