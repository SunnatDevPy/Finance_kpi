from pydantic import BaseModel


class ContractImportError(BaseModel):
    row: int
    message: str


class ContractImportDuplicate(BaseModel):
    row: int
    company_name: str
    contract_number: str | None = None


class ContractImportResult(BaseModel):
    created_contracts: int
    created_clients: int
    created_service_types: int
    duplicates: list[ContractImportDuplicate]
    errors: list[ContractImportError]
