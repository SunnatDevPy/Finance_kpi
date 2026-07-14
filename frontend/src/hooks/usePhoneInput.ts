import { useLayoutEffect, useRef, type ChangeEvent } from "react";

const COUNTRY_CODE = "998";
const NATIONAL_LENGTH = 9;

/** 9 ta milliy raqam → "+998 93 105 05 15" */
export function formatUzPhone(nationalDigits: string): string {
  if (!nationalDigits) return "+998 ";
  const d = nationalDigits.slice(0, NATIONAL_LENGTH);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  let out = "+998";
  if (parts[0]) out += ` ${parts[0]}`;
  if (parts[1]) out += ` ${parts[1]}`;
  if (parts[2]) out += ` ${parts[2]}`;
  if (parts[3]) out += ` ${parts[3]}`;
  return out;
}

/** API / forma uchun E.164: +998931050515 */
export function toPhoneE164(nationalDigits: string): string {
  if (!nationalDigits) return "";
  return `+${COUNTRY_CODE}${nationalDigits}`;
}

/** Saqlangan telefonni 9 xonali milliy qismga ajratadi */
export function parsePhoneNational(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(COUNTRY_CODE)) return digits.slice(3, 3 + NATIONAL_LENGTH);
  if (digits.length === NATIONAL_LENGTH) return digits;
  return digits.slice(-NATIONAL_LENGTH);
}

function countDigits(text: string): number {
  const match = text.match(/\d/g);
  return match ? match.length : 0;
}

function indexAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return formatted.indexOf(" ") + 1 || 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

function extractNationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith(COUNTRY_CODE)) digits = digits.slice(3);
  return digits.slice(0, NATIONAL_LENGTH);
}

/**
 * O'zbekiston telefoni: doim +998 prefiksi, probel bilan "XX XXX XX XX".
 * Form state — 9 xonali milliy raqam (masalan "931050515").
 */
export function usePhoneInput(value: string, onValueChange: (nationalDigits: string) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursorDigits = useRef<number | null>(null);

  const displayValue = formatUzPhone(value);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const raw = el.value;
    const selectionStart = el.selectionStart ?? raw.length;
    const rawDigitsBeforeCursor = countDigits(raw.slice(0, selectionStart));
    const national = extractNationalDigits(raw);
    const prevNational = value;
    const prevFullDigits = COUNTRY_CODE.length + prevNational.length;
    const nextFullDigits = COUNTRY_CODE.length + national.length;
    const strippedCount = Math.max(0, prevFullDigits - nextFullDigits);
    pendingCursorDigits.current = Math.max(
      COUNTRY_CODE.length + 1,
      rawDigitsBeforeCursor - strippedCount,
    );
    onValueChange(national);
  };

  useLayoutEffect(() => {
    if (pendingCursorDigits.current == null) return;
    const el = inputRef.current;
    if (el) {
      const pos = indexAfterDigits(formatUzPhone(value), pendingCursorDigits.current);
      el.setSelectionRange(pos, pos);
    }
    pendingCursorDigits.current = null;
  }, [value]);

  return { inputRef, displayValue, handleChange };
}
