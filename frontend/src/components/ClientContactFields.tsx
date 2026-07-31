import { AnimatePresence, motion } from "framer-motion";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { FloatingLabelInput, FloatingLabelPhoneInput } from "@/components/ui/floating-label-input";
import { Label } from "@/components/ui/label";
import { MotionButton, motionTap } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import type { ClientContactFormItem } from "@/types";

interface ClientContactFieldsProps {
  contacts: ClientContactFormItem[];
  onChange: (contacts: ClientContactFormItem[]) => void;
}

export function emptyClientContact(): ClientContactFormItem {
  return { name: "", phone: "" };
}

export function ClientContactFields({ contacts, onChange }: ClientContactFieldsProps) {
  const { t } = useI18n();

  const updateContact = (index: number, patch: Partial<ClientContactFormItem>) => {
    const next = contacts.map((contact, contactIndex) =>
      contactIndex === index ? { ...contact, ...patch } : contact,
    );
    onChange(next);
  };

  const addContact = () => {
    onChange([...contacts, emptyClientContact()]);
  };

  const removeContact = (index: number) => {
    if (contacts.length <= 1) return;
    onChange(contacts.filter((_, contactIndex) => contactIndex !== index));
  };

  return (
    <div className="flex flex-col gap-3 md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{t("clients.contactsSection")}</Label>
        <MotionButton type="button" variant="outline" size="sm" onClick={addContact} {...motionTap}>
          <PlusIcon data-icon="inline-start" />
          {t("clients.addContact")}
        </MotionButton>
      </div>
      <AnimatePresence initial={false}>
        {contacts.map((contact, index) => (
          <motion.div
            key={`contact-${index}`}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/60 bg-muted/10 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <FloatingLabelInput
                guardAutofill
                name={`wtma_client_contact_${index}`}
                label={t("clients.contact")}
                value={contact.name}
                onChange={(event) => updateContact(index, { name: event.target.value })}
              />
              <FloatingLabelPhoneInput
                id={`client_contact_phone_${index}`}
                label={t("clients.phone")}
                value={contact.phone}
                onValueChange={(phone) => updateContact(index, { phone })}
              />
              {contacts.length > 1 ? (
                <MotionButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeContact(index)}
                  aria-label={t("clients.removeContact")}
                  {...motionTap}
                >
                  <Trash2Icon className="size-4" />
                </MotionButton>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
