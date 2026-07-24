from decimal import Decimal

from pydantic import BaseModel, Field


class CompanyProfile(BaseModel):
    company_name: str = ""
    company_address: str = ""
    company_phone: str = ""
    company_inn: str = ""
    company_bank_name: str = ""
    company_bank_account: str = ""
    company_mfo: str = ""
    company_director: str = ""


class SettingsRead(BaseModel):
    monthly_plan: Decimal
    company: CompanyProfile
    finance_auto_payments_from_year: int = 2027


class MonthlyPlanUpdate(BaseModel):
    monthly_plan: Decimal = Field(gt=0, decimal_places=2, max_digits=18)


class FinanceAutoPaymentsYearUpdate(BaseModel):
    finance_auto_payments_from_year: int = Field(ge=2019, le=2035)


class CompanyProfileUpdate(BaseModel):
    company_name: str | None = Field(default=None, max_length=255)
    company_address: str | None = Field(default=None, max_length=500)
    company_phone: str | None = Field(default=None, max_length=50)
    company_inn: str | None = Field(default=None, max_length=50)
    company_bank_name: str | None = Field(default=None, max_length=255)
    company_bank_account: str | None = Field(default=None, max_length=100)
    company_mfo: str | None = Field(default=None, max_length=50)
    company_director: str | None = Field(default=None, max_length=255)
