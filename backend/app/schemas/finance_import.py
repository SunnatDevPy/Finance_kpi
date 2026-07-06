from pydantic import BaseModel


class FinanceImportError(BaseModel):
    row: int
    message: str


class FinanceImportResult(BaseModel):
    created_income: int
    created_expense: int
    errors: list[FinanceImportError]
