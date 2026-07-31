from typing import Protocol

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Client, ClientContact


class ContactInput(Protocol):
    name: str
    phone: str | None


def normalize_contact_inputs(
    contacts: list[ContactInput] | None,
    contact_person: str | None,
    phone: str | None,
) -> list[tuple[str, str | None]]:
    if contacts is not None:
        normalized: list[tuple[str, str | None]] = []
        for item in contacts:
            name = item.name.strip()
            phone_value = item.phone.strip() if item.phone else None
            if not name and not phone_value:
                continue
            if not name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Mas'ul shaxs ismi to'ldirilishi kerak",
                )
            normalized.append((name, phone_value))
        return normalized

    if contact_person and contact_person.strip():
        return [(contact_person.strip(), phone.strip() if phone else None)]
    return []


def apply_client_contacts(client: Client, contacts: list[tuple[str, str | None]]) -> None:
    client.contacts.clear()
    for index, (name, phone) in enumerate(contacts):
        client.contacts.append(ClientContact(name=name, phone=phone, sort_order=index))
    sync_legacy_contact_fields(client)


def sync_legacy_contact_fields(client: Client) -> None:
    if client.contacts:
        first = sorted(client.contacts, key=lambda contact: contact.sort_order)[0]
        client.contact_person = first.name
        client.phone = first.phone
    else:
        client.contact_person = None
        client.phone = None


def legacy_contacts_from_client(client: Client) -> list[tuple[str, str | None]]:
    if client.contacts:
        return [
            (contact.name, contact.phone)
            for contact in sorted(client.contacts, key=lambda item: item.sort_order)
        ]
    if client.contact_person:
        return [(client.contact_person, client.phone)]
    return []
