import type { Client, ClientContactFormItem } from "@/types";
import { parsePhoneNational, toPhoneE164 } from "@/hooks/usePhoneInput";
import { emptyClientContact } from "@/components/ClientContactFields";

export function clientContactsFromClient(client: Client): ClientContactFormItem[] {
  if (client.contacts?.length) {
    return client.contacts.map((contact) => ({
      name: contact.name,
      phone: parsePhoneNational(contact.phone || ""),
    }));
  }
  if (client.contact_person || client.phone) {
    return [
      {
        name: client.contact_person || "",
        phone: parsePhoneNational(client.phone || ""),
      },
    ];
  }
  return [emptyClientContact()];
}

export function buildClientContactsPayload(contacts: ClientContactFormItem[]): ClientContactFormItem[] {
  return contacts
    .map((contact) => ({
      name: contact.name.trim(),
      phone: contact.phone ? toPhoneE164(contact.phone) : "",
    }))
    .filter((contact) => contact.name);
}

export function formatClientContactsLabel(client: Client): string {
  if (client.contacts?.length) {
    const [first, ...rest] = client.contacts;
    return rest.length > 0 ? `${first.name} (+${rest.length})` : first.name;
  }
  return client.contact_person || "—";
}

export function formatClientPhonesLabel(client: Client): string {
  if (client.contacts?.length) {
    const phones = client.contacts.map((contact) => contact.phone).filter(Boolean);
    if (phones.length === 0) return "—";
    return phones.length > 1 ? `${phones[0]} (+${phones.length - 1})` : String(phones[0]);
  }
  return client.phone || "—";
}
