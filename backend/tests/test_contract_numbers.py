from app.services.contract_numbers import increment_contract_number, suggest_next_contract_number


def test_increment_contract_number_pure_digits():
    assert increment_contract_number("5") == "6"
    assert increment_contract_number("39") == "40"


def test_increment_contract_number_suffix_format():
    assert increment_contract_number("No39-1") == "No39-2"
    assert increment_contract_number("No39-2") == "No39-3"


def test_increment_contract_number_alpha_num_starts_suffix_series():
    assert increment_contract_number("No39") == "No39-1"


def test_suggest_next_contract_number_pure_digits():
    assert suggest_next_contract_number(["1", "2", "5"]) == ("5", "6")


def test_suggest_next_contract_number_empty():
    assert suggest_next_contract_number([]) == (None, "1")


def test_suggest_next_contract_number_suffix_format():
    assert suggest_next_contract_number(["No39-2", "No39-1"]) == ("No39-2", "No39-3")


def test_suggest_next_contract_number_uses_most_recent_format():
    assert suggest_next_contract_number(["No39-1", "5", "3"]) == ("No39-1", "No39-2")
