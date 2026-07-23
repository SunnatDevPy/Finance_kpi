from datetime import date

from app.models import Contract, ContractWorkflowStatus, Payment

AUTO_COMPLETION_PAYMENT_NOTE = "Shartnoma yakunlanganda avtomatik tushum"


class ContractStatusError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail


def infer_contract_workflow_status(
    contract: Contract,
    *,
    today: date | None = None,
) -> ContractWorkflowStatus:
    """Mavjud shartnomalar uchun holatni sanalar va bekor qilish bo'yicha taxmin qiladi."""
    ref = today or date.today()
    if contract.is_cancelled:
        return ContractWorkflowStatus.TOXTATILDI
    if contract.end_date < ref:
        return ContractWorkflowStatus.TUGADI
    if contract.start_date > ref:
        return ContractWorkflowStatus.YANGI
    return ContractWorkflowStatus.DAVOM_ETMOQDA


def sync_status_after_cancellation(contract: Contract) -> None:
    if contract.is_cancelled:
        contract.status = ContractWorkflowStatus.TOXTATILDI


def sync_status_after_reactivation(contract: Contract, *, today: date | None = None) -> None:
    if contract.is_cancelled:
        return
    contract.status = infer_contract_workflow_status(contract, today=today)


def sync_status_after_payment(contract: Contract) -> None:
    """Qarz qolmasa shartnomani avtomatik yakunlangan holatga o'tkazadi."""
    if contract.is_cancelled:
        return
    if contract.status == ContractWorkflowStatus.TOXTATILDI:
        return
    if contract.total_amount <= 0:
        return
    if contract.debt_amount <= 0:
        contract.status = ContractWorkflowStatus.TUGADI


def confirm_contract(contract: Contract) -> None:
    if contract.is_cancelled:
        raise ContractStatusError("Bekor qilingan shartnomani tasdiqlab bo'lmaydi")
    if contract.status != ContractWorkflowStatus.YANGI:
        raise ContractStatusError("Faqat yangi shartnomalarni tasdiqlash mumkin")
    contract.status = ContractWorkflowStatus.DAVOM_ETMOQDA


def settle_contract_debt_on_completion(
    contract: Contract,
    *,
    paid_at: date | None = None,
) -> Payment | None:
    """Qolgan qarzni nolga tushirish uchun avtomatik to'lov yozadi."""
    debt = contract.debt_amount
    if debt <= 0:
        return None
    payment = Payment(
        amount=debt,
        paid_at=paid_at or contract.end_date,
        note=AUTO_COMPLETION_PAYMENT_NOTE,
    )
    contract.payments.append(payment)
    return payment


def complete_contract(contract: Contract) -> Payment | None:
    if contract.is_cancelled:
        raise ContractStatusError("Bekor qilingan shartnomani yakunlab bo'lmaydi")
    if contract.status == ContractWorkflowStatus.TOXTATILDI:
        raise ContractStatusError("To'xtatilgan shartnomani yakunlab bo'lmaydi")
    if contract.status == ContractWorkflowStatus.TUGADI:
        raise ContractStatusError("Shartnoma allaqachon yakunlangan")
    if contract.status != ContractWorkflowStatus.DAVOM_ETMOQDA:
        raise ContractStatusError("Avval shartnomani tasdiqlang")
    contract.status = ContractWorkflowStatus.TUGADI
    return settle_contract_debt_on_completion(contract)
