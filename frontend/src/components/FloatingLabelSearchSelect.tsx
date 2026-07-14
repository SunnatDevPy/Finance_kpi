import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import {
  floatedLabel,
  inputStyles,
  labelPeer,
  restingLabel,
} from "@/components/ui/floating-label-input";
import { cn } from "@/lib/utils";
import { antiAutofillAttrs } from "@/lib/autofill";
import { useAutofillGuard } from "@/hooks/useAutofillGuard";
import { useI18n } from "@/context/I18nContext";
import {
  filterGeoOptions,
  geoOptionLabel,
  type GeoOption,
} from "@/data/geoRegions";

interface FloatingLabelSearchSelectProps {
  label: string;
  value: string;
  options: GeoOption[];
  onValueChange: (value: string) => void;
  id?: string;
  /** Brauzer autofill uchun — id/name da country, city kabi so'zlar bo'lmasin */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  containerClassName?: string;
  className?: string;
}

export function FloatingLabelSearchSelect({
  label,
  value,
  options,
  onValueChange,
  id,
  name,
  required,
  disabled = false,
  containerClassName,
  className,
}: FloatingLabelSearchSelectProps) {
  const { t, locale } = useI18n();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputName = name ?? `wtma-search-${inputId.replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  const hasStoredValue = Boolean(value);
  const { guardProps, unlock } = useAutofillGuard(true, hasStoredValue);
  const guardReadOnly = "readOnly" in guardProps ? guardProps.readOnly : false;

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const displayLabel = selectedOption
    ? geoOptionLabel(selectedOption, locale)
    : value || "";

  const filtered = useMemo(() => filterGeoOptions(options, query), [options, query]);

  const isFloated = Boolean(value) || open || query.length > 0;

  const updateCoords = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateCoords();
    const onScrollOrResize = () => updateCoords();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  const openList = () => {
    if (disabled) return;
    unlock();
    setOpen(true);
    setQuery("");
    updateCoords();
  };

  const closeList = () => {
    setOpen(false);
    setQuery("");
  };

  const selectOption = (option: GeoOption) => {
    onValueChange(option.value);
    closeList();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) openList();
      setHighlightIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openList();
      setHighlightIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && filtered[highlightIndex]) {
        selectOption(filtered[highlightIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeList();
    }
  };

  const inputValue = open ? query : displayLabel;
  const isDisplayMode = !open && Boolean(value) && !query;
  const isReadOnly = guardReadOnly || isDisplayMode;

  const activateField = () => {
    if (disabled) return;
    unlock();
    openList();
  };

  return (
    <div ref={containerRef} className={cn("relative pt-3", containerClassName)}>
      <div className="relative">
        <InputPrimitive
          id={inputId}
          name={inputName}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${inputId}-listbox`}
          {...antiAutofillAttrs}
          required={required}
          disabled={disabled}
          value={inputValue}
          readOnly={isReadOnly}
          placeholder=" "
          data-slot="input"
          className={cn(
            inputStyles,
            "peer pr-9",
            disabled && "opacity-60",
            !open && !value && "text-transparent",
            className,
          )}
          onMouseDown={() => {
            if (disabled) return;
            unlock();
            if (!open) openList();
          }}
          onFocus={(event) => {
            if ("onFocus" in guardProps) guardProps.onFocus(event);
            if (disabled) return;
            if (!open) openList();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={label}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (open ? closeList() : activateField())}
        >
          <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      <label
        htmlFor={inputId}
        className={cn(labelPeer, isFloated ? floatedLabel : restingLabel)}
      >
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </label>

      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={listRef}
              id={`${inputId}-listbox`}
              role="listbox"
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: coords.width,
                zIndex: 10000,
              }}
              className="max-h-56 overflow-y-auto rounded-xl border border-border/70 bg-popover/95 p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/5 backdrop-blur-xl"
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">{t("common.noResults")}</p>
              ) : (
                filtered.map((option, index) => {
                  const active = index === highlightIndex;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={option.value === value}
                      className={cn(
                        "flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/70",
                        option.value === value && "font-medium text-brand-700 dark:text-brand-300",
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => selectOption(option)}
                    >
                      {geoOptionLabel(option, locale)}
                    </button>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
