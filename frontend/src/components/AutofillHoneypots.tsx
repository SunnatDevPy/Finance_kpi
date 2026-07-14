/** Chrome manzil/ism autofillini soxta maydonlarga yo'naltirish */
export function AutofillHoneypots() {
  return (
    <div
      className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      aria-hidden
    >
      <input tabIndex={-1} name="country" autoComplete="country-name" defaultValue="" />
      <input tabIndex={-1} name="city" autoComplete="address-level2" defaultValue="" />
      <input tabIndex={-1} name="state" autoComplete="address-level1" defaultValue="" />
      <input tabIndex={-1} name="name" autoComplete="name" defaultValue="" />
      <input tabIndex={-1} name="given-name" autoComplete="given-name" defaultValue="" />
      <input tabIndex={-1} name="family-name" autoComplete="family-name" defaultValue="" />
    </div>
  );
}
