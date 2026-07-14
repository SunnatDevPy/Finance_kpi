import { useEffect, useRef, useState, type FocusEvent } from "react";

import { antiAutofillAttrs } from "@/lib/autofill";

/** Chrome manzil/ism autofillini bloklash — birinchi mousedowngacha readonly */
export function useAutofillGuard(enabled: boolean, hasValue: boolean) {
  const [unlocked, setUnlocked] = useState(hasValue);
  const unlockedRef = useRef(hasValue);

  useEffect(() => {
    if (!hasValue) {
      unlockedRef.current = false;
      setUnlocked(false);
    }
  }, [hasValue]);

  const unlock = () => {
    unlockedRef.current = true;
    setUnlocked(true);
  };

  if (!enabled) {
    return { guardProps: {}, unlocked: true, unlock: () => undefined };
  }

  const guardProps = {
    ...antiAutofillAttrs,
    readOnly: !unlocked,
    onMouseDown: unlock,
    onFocus: (event: FocusEvent<HTMLInputElement>) => {
      if (!unlockedRef.current) event.currentTarget.blur();
    },
  };

  return {
    guardProps,
    unlocked,
    unlock,
  };
}
