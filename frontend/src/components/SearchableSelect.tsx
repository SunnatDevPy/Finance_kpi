import {
  useEffect,
  useId,
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { antiAutofillAttrs } from "@/lib/autofill";
import { useFloatingPosition } from "@/hooks/useFloatingPosition";
import { useI18n } from "@/context/I18nContext";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  options: SearchableSelectOption[];
  onValueChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  /** default = label above; floating = form field with inner label */
  variant?: "default" | "floating";
}

function filterOptions(options: SearchableSelectOption[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;
  return options.filter((option) => option.label.toLowerCase().includes(normalized));
}

export function SearchableSelect({
  label,
  value,
  options,
  onValueChange,
  id,
  placeholder,
  required,
  disabled = false,
  className,
  containerClassName,
  variant = "default",
}: SearchableSelectProps) {
  const { t } = useI18n();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const coords = useFloatingPosition({
    triggerRef: containerRef,
    popoverRef: listRef,
    isOpen: open,
    targetWidth: "trigger",
    estimatedHeight: 240,
    viewportPadding: 12,
    offset: 4,
  });

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const displayLabel = selectedOption?.label ?? "";
  const filtered = useMemo(() => filterOptions(options, query), [options, query]);
  const isFloated = variant === "floating" && (Boolean(value) || open || query.length > 0);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node) || listRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
      setQuery("");
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
  };

  const closeList = () => {
    setOpen(false);
    setQuery("");
  };

  const selectOption = (option: SearchableSelectOption) => {
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
  const triggerClassName =
    variant === "floating"
      ? cn(inputStyles, "peer pr-9", disabled && "opacity-60", !open && !value && "text-transparent", className)
      : cn(
          "flex h-12 w-full items-center rounded-lg border border-input bg-background/80 px-3 pr-9 text-sm shadow-sm backdrop-blur-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          !value && !open && "text-muted-foreground",
          className,
        );

  const dropdown = createPortal(
    <AnimatePresence>
      {open && coords && (
        <motion.div
          ref={listRef}
          id={`${inputId}-listbox`}
          role="listbox"
          initial={{
            opacity: 0,
            y: coords.placement === "top" ? 4 : -4,
            scale: 0.98,
          }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: coords.placement === "top" ? 4 : -4,
            scale: 0.98,
          }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            maxHeight: coords.maxHeight ? Math.min(coords.maxHeight, 260) : 240,
            zIndex: 10000,
          }}
          className="overflow-y-auto rounded-xl border border-border/70 bg-popover/95 p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/5 backdrop-blur-xl"
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
                    active ? "bg-accent text-accent-foreground" : "hover:bg-muted/70",
                    option.value === value && "font-medium text-brand-700 dark:text-brand-300",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  {option.label}
                </button>
              );
            })
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );

  if (variant === "floating") {
    return (
      <div ref={containerRef} className={cn("relative pt-3", containerClassName)}>
        <div className="relative">
          <InputPrimitive
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={`${inputId}-listbox`}
            {...antiAutofillAttrs}
            required={required}
            disabled={disabled}
            value={inputValue}
            readOnly={isDisplayMode}
            placeholder=" "
            data-slot="input"
            className={triggerClassName}
            onMouseDown={() => {
              if (disabled) return;
              if (!open) openList();
            }}
            onFocus={() => {
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
            onClick={() => (open ? closeList() : openList())}
          >
            <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
          </button>
        </div>
        <label htmlFor={inputId} className={cn(labelPeer, isFloated ? floatedLabel : restingLabel)}>
          {label}
          {required ? <span className="text-brand-500"> *</span> : null}
        </label>
        {dropdown}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-2", containerClassName)}>
      <Label htmlFor={inputId}>
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </Label>
      <div className="relative">
        <InputPrimitive
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${inputId}-listbox`}
          {...antiAutofillAttrs}
          required={required}
          disabled={disabled}
          value={inputValue}
          readOnly={isDisplayMode}
          placeholder={placeholder ?? t("contracts.selectClient")}
          data-slot="input"
          className={triggerClassName}
          onMouseDown={() => {
            if (disabled) return;
            if (!open) openList();
          }}
          onFocus={() => {
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
          onClick={() => (open ? closeList() : openList())}
        >
          <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {dropdown}
    </div>
  );
}
