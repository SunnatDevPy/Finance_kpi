from pydantic import BaseModel


class ClientImportError(BaseModel):
    row: int
    message: str


class ClientImportDuplicate(BaseModel):
    row: int
    company_name: str


class ClientImportResult(BaseModel):
    created: int
    duplicates: list[ClientImportDuplicate]
    errors: list[ClientImportError]
