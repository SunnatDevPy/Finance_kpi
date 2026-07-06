import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";
import { useMoneyInput } from "@/hooks/useMoneyInput";

export const inputStyles =
  "peer h-12 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 pb-2.5 pt-5 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

/** Label chiziq ustida — scale yo‘q, o‘qilishi oson o‘lcham */
export const floatedLabel =
  "top-0 z-20 -translate-y-1/2 bg-background px-2 text-sm font-semibold leading-tight text-brand-700 dark:bg-card dark:text-brand-300";

export const restingLabel = "top-1/2 -translate-y-1/2 text-sm text-muted-foreground";

export const labelPeer =
  "pointer-events-none absolute left-3 z-20 transition-all duration-200 ease-out peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:bg-background peer-focus:px-2 peer-focus:text-sm peer-focus:font-semibold peer-focus:leading-tight peer-focus:text-brand-700 peer-focus:z-20 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-2 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:leading-tight peer-[:not(:placeholder-shown)]:text-brand-700 peer-[:not(:placeholder-shown)]:z-20 dark:peer-focus:bg-card dark:peer-[:not(:placeholder-shown)]:bg-card dark:peer-focus:text-brand-300 dark:peer-[:not(:placeholder-shown)]:text-brand-300";

type FloatingLabelInputProps = React.ComponentProps<"input"> & {
  label: string;
  containerClassName?: string;
};

function FloatingLabelInput({
  label,
  id,
  className,
  containerClassName,
  required,
  type,
  value,
  defaultValue,
  ...props
}: FloatingLabelInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const isDateLike = type === "date" || type === "datetime-local" || type === "time";
  const hasValue =
    (value !== undefined && value !== null && String(value).length > 0) ||
    (defaultValue !== undefined && defaultValue !== null && String(defaultValue).length > 0);
  const isFloated = hasValue || isDateLike;

  return (
    <div className={cn("relative pt-3", containerClassName)}>
      <InputPrimitive
        id={inputId}
        type={type}
        required={required}
        value={value}
        defaultValue={defaultValue}
        placeholder=" "
        data-slot="input"
        className={cn(inputStyles, className)}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(labelPeer, isFloated ? floatedLabel : restingLabel)}
      >
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </label>
    </div>
  );
}

type FloatingLabelMoneyInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type"
> & {
  label: string;
  containerClassName?: string;
  /** Clean digit string, e.g. "1500000" — no spaces, no leading zeros. */
  value: string;
  onValueChange: (digits: string) => void;
};

/** Money amount field — formats with space thousand-separators as you type, blocks leading zeros. */
function FloatingLabelMoneyInput({
  label,
  id,
  className,
  containerClassName,
  required,
  value,
  onValueChange,
  ...props
}: FloatingLabelMoneyInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const { inputRef, displayValue, handleChange } = useMoneyInput(value, onValueChange);
  const isFloated = displayValue.length > 0;

  return (
    <div className={cn("relative pt-3", containerClassName)}>
      <InputPrimitive
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        value={displayValue}
        onChange={handleChange}
        placeholder=" "
        data-slot="input"
        className={cn(inputStyles, className)}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(labelPeer, isFloated ? floatedLabel : restingLabel)}
      >
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </label>
    </div>
  );
}

type FloatingLabelTextareaProps = React.ComponentProps<"textarea"> & {
  label: string;
  containerClassName?: string;
};

function FloatingLabelTextarea({
  label,
  id,
  className,
  containerClassName,
  required,
  value,
  defaultValue,
  rows = 3,
  ...props
}: FloatingLabelTextareaProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const hasValue =
    (value !== undefined && value !== null && String(value).length > 0) ||
    (defaultValue !== undefined && defaultValue !== null && String(defaultValue).length > 0);

  return (
    <div className={cn("relative pt-3", containerClassName)}>
      <textarea
        id={inputId}
        required={required}
        value={value}
        defaultValue={defaultValue}
        rows={rows}
        placeholder=" "
        data-slot="textarea"
        className={cn(
          "peer field-sizing-content min-h-24 w-full rounded-lg border border-input bg-transparent px-3 pb-2.5 pt-6 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(labelPeer, hasValue ? floatedLabel : "top-6 text-sm text-muted-foreground")}
      >
        {label}
        {required ? <span className="text-brand-500"> *</span> : null}
      </label>
    </div>
  );
}

export { FloatingLabelInput, FloatingLabelMoneyInput, FloatingLabelTextarea };
