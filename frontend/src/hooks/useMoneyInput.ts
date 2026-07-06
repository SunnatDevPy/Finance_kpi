import { useLayoutEffect, useRef, type ChangeEvent } from "react";

function formatWithSpaces(digits: string): string {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function countDigits(text: string): number {
  const match = text.match(/\d/g);
  return match ? match.length : 0;
}

function indexAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * Drives a plain-text `<input>` that displays a money amount with
 * space thousand-separators ("1 500 000") while the underlying form
 * state stays a clean digit string ("1500000"). Also strips leading
 * zeros as the user types (e.g. "0200000" -> "200000") and keeps the
 * caret in the right spot across reformatting.
 */
export function useMoneyInput(value: string, onValueChange: (digits: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursorDigits = useRef<number | null>(null);

  const displayValue = formatWithSpaces(value);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const raw = el.value;
    const selectionStart = el.selectionStart ?? raw.length;
    const rawDigitsBeforeCursor = countDigits(raw.slice(0, selectionStart));
    const fullDigits = raw.replace(/\D/g, "");
    const sanitized = fullDigits.replace(/^0+/, "");
    const strippedCount = fullDigits.length - sanitized.length;
    pendingCursorDigits.current = Math.max(0, rawDigitsBeforeCursor - strippedCount);
    onValueChange(sanitized);
  };

  useLayoutEffect(() => {
    if (pendingCursorDigits.current == null) return;
    const el = inputRef.current;
    if (el) {
      const pos = indexAfterDigits(formatWithSpaces(value), pendingCursorDigits.current);
      el.setSelectionRange(pos, pos);
    }
    pendingCursorDigits.current = null;
  }, [value]);

  return { inputRef, displayValue, handleChange };
}
