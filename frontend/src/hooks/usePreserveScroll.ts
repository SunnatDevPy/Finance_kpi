/** Capture and restore window scroll around async UI updates. */
export function getScrollY() {
  return window.scrollY;
}

export function restoreScrollY(y: number) {
  requestAnimationFrame(() => {
    window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
  });
}

export async function withPreservedScroll<T>(fn: () => Promise<T>): Promise<T> {
  const y = getScrollY();
  try {
    return await fn();
  } finally {
    restoreScrollY(y);
  }
}
