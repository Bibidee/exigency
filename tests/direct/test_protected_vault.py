import json
from tests.direct.conftest import to_hex


def test_only_gate_can_pause(direct_vm, direct_deploy, direct_alice, direct_bob):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("emergency authority requires CapabilityGate"):
        vault.emergency_pause_withdrawals(30, "INC-01", "EXC-01", "a"*64)


def test_gate_pause_expires_by_transaction_time(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp("2026-09-27T20:00:00Z")
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    direct_vm.sender = direct_alice
    until = vault.emergency_pause_withdrawals(30, "INC-01", "EXC-01", "a"*64)
    status = json.loads(vault.get_status_json())
    assert status["withdrawals_paused"] is True
    assert status["withdrawals_paused_until"] == until
    direct_vm.warp("2026-09-27T20:31:00Z")
    status = json.loads(vault.get_status_json())
    assert status["withdrawals_paused"] is False


def test_deposit_withdraw_and_value_accounting(direct_vm, direct_deploy, direct_alice):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 10**16

    direct_vm.sender = direct_alice
    direct_vm.value = amount
    assert int(vault.deposit()) == amount
    status = json.loads(vault.get_status_json())
    assert int(status["total_credits"]) == amount
    assert int(vault.get_credit(to_hex(direct_alice))) == amount

    direct_vm.value = 0
    assert int(vault.withdraw(amount // 2)) == amount // 2
    status = json.loads(vault.get_status_json())
    assert int(status["total_credits"]) == amount // 2
    assert int(vault.get_credit(to_hex(direct_alice))) == amount // 2


def test_withdraw_rejects_insufficient_balance_and_paused_withdrawal(direct_vm, direct_deploy, direct_alice):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("insufficient vault credit"):
        vault.withdraw(1)
    direct_vm.warp("2026-09-27T20:00:00Z")
    vault.emergency_pause_withdrawals(5, "INC-PAUSE", "EXC-PAUSE", "b" * 64)
    direct_vm.value = 10**16
    with direct_vm.expect_revert("withdrawals are temporarily paused"):
        vault.withdraw(1)


def test_duplicate_emergency_delivery_is_idempotent(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp("2026-09-27T20:00:00Z")
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    direct_vm.sender = direct_alice
    first_until = vault.emergency_pause_withdrawals(5, "INC-IDEMPOTENT", "EXC-IDEMPOTENT", "c" * 64)
    vault.emergency_pause_withdrawals(5, "INC-IDEMPOTENT", "EXC-IDEMPOTENT", "c" * 64)
    status = json.loads(vault.get_status_json())
    assert status["withdrawals_paused_until"] == first_until
    assert len(vault.list_emergency_history()) == 1
    assert vault.get_applied_capability_digest("EXC-IDEMPOTENT") == "c" * 64
