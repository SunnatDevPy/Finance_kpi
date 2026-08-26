import { useLayoutEffect, useState, type RefObject } from "react";

export interface FloatingPositionOptions {
  triggerRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  /** Estimated height in px before DOM measurement */
  estimatedHeight?: number;
  /** Fixed / max target width in px, 'trigger' to match trigger element width, or dynamic function */
  targetWidth?: number | "trigger" | (() => number);
  /** Minimum distance from screen edges in px (default 10) */
  viewportPadding?: number;
  /** Distance between trigger and popover in px (default 6) */
  offset?: number;
}

export interface FloatingCoords {
  top: number;
  left: number;
  width: number;
  placement: "top" | "bottom";
}

export function useFloatingPosition({
  triggerRef,
  popoverRef,
  isOpen,
  estimatedHeight = 290,
  targetWidth,
  viewportPadding = 10,
  offset = 6,
}: FloatingPositionOptions) {
  const [coords, setCoords] = useState<FloatingCoords | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }

    const calculate = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popover = popoverRef.current;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Compute popover width
      let width: number;
      if (targetWidth === "trigger") {
        width = Math.min(triggerRect.width, viewportWidth - viewportPadding * 2);
      } else if (typeof targetWidth === "function") {
        width = Math.min(targetWidth(), viewportWidth - viewportPadding * 2);
      } else if (typeof targetWidth === "number") {
        width = Math.min(targetWidth, viewportWidth - viewportPadding * 2);
      } else {
        width = Math.min(triggerRect.width, viewportWidth - viewportPadding * 2);
      }

      // Popover height
      const measuredHeight =
        popover && popover.offsetHeight > 0 ? popover.offsetHeight : estimatedHeight;

      // Available vertical space
      const spaceBelow = viewportHeight - triggerRect.bottom - offset - viewportPadding;
      const spaceAbove = triggerRect.top - offset - viewportPadding;

      let placement: "top" | "bottom" = "bottom";
      let top = 0;

      // Check if it fits below or above
      if (spaceBelow >= measuredHeight) {
        placement = "bottom";
        top = triggerRect.bottom + offset;
      } else if (spaceAbove >= measuredHeight) {
        placement = "top";
        top = triggerRect.top - offset - measuredHeight;
      } else if (spaceAbove > spaceBelow) {
        placement = "top";
        top = Math.max(viewportPadding, triggerRect.top - offset - measuredHeight);
      } else {
        placement = "bottom";
        top = triggerRect.bottom + offset;
      }

      // Hard clamp bounds against screen edges to never overflow
      if (top + measuredHeight > viewportHeight - viewportPadding) {
        top = Math.max(viewportPadding, viewportHeight - viewportPadding - measuredHeight);
      }
      if (top < viewportPadding) {
        top = viewportPadding;
      }

      // Compute horizontal left position and clamp
      let left = triggerRect.left;
      if (left + width > viewportWidth - viewportPadding) {
        left = viewportWidth - viewportPadding - width;
      }
      if (left < viewportPadding) {
        left = viewportPadding;
      }

      setCoords({ top, left, width, placement });
    };

    calculate();

    // Re-measure after initial DOM paint to ensure accurate offsetHeight
    const rafId = requestAnimationFrame(calculate);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && popoverRef.current) {
      resizeObserver = new ResizeObserver(() => {
        calculate();
      });
      resizeObserver.observe(popoverRef.current);
    }

    const onScrollOrResize = () => calculate();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [isOpen, triggerRef, popoverRef, estimatedHeight, targetWidth, viewportPadding, offset]);

  return coords;
}
