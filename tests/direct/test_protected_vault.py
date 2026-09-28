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
