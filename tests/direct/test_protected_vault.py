import json

import pytest

from tests.direct.conftest import to_hex


def deploy_target(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    return direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))


def test_only_gate_can_pause_protected_action(direct_vm, direct_deploy, direct_alice, direct_bob):
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("emergency authority requires CapabilityGate"):
        target.emergency_pause_protected_action(30, "INC-01", "EXC-01", "a" * 64, to_hex(direct_alice))


def test_unrelated_wallet_cannot_pause_target_through_configured_gate(direct_vm, direct_deploy, direct_alice, direct_bob):
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("target governance rejected capability holder"):
        target.emergency_pause_protected_action(30, "INC-UNAUTHORIZED", "EXC-UNAUTHORIZED", "a" * 64, to_hex(direct_bob))
    assert json.loads(target.get_status_json())["protected_action_paused"] is False


def test_protected_action_executes_and_updates_authoritative_state(direct_vm, direct_deploy, direct_alice):
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice

    assert int(target.execute_protected_action("ACTION-01")) == 1
    record = json.loads(target.get_protected_action_json("ACTION-01"))
    status = json.loads(target.get_status_json())
    assert record["holder"] == to_hex(direct_alice).lower()
    assert record["sequence"] == "1"
    assert int(status["protected_action_count"]) == 1
    assert target.list_protected_action_keys() == ["ACTION-01"]


def test_replayed_protected_action_is_rejected(direct_vm, direct_deploy, direct_alice):
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    target.execute_protected_action("ACTION-REPLAY")
    with direct_vm.expect_revert("protected action already executed"):
        target.execute_protected_action("ACTION-REPLAY")
    assert int(target.get_protected_action_count()) == 1


def test_direct_eoa_enforcement_rejects_child_context(direct_vm, direct_deploy, direct_alice, direct_bob):
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_bob
    direct_vm.origin = direct_alice
    with direct_vm.expect_revert("protected actions require a direct EOA caller"):
        target.execute_protected_action("ACTION-CHILD")


def test_pause_blocks_action_and_expires_by_transaction_time(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp("2026-09-27T20:00:00Z")
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    until = target.emergency_pause_protected_action(5, "INC-PAUSE", "EXC-PAUSE", "b" * 64, to_hex(direct_alice))
    status = json.loads(target.get_status_json())
    assert status["protected_action_paused"] is True
    assert status["protected_action_paused_until"] == until
    with direct_vm.expect_revert("protected action is temporarily paused"):
        target.execute_protected_action("ACTION-DURING-PAUSE")

    direct_vm.warp("2026-09-27T20:06:00Z")
    assert json.loads(target.get_status_json())["protected_action_paused"] is False
    assert int(target.execute_protected_action("ACTION-AFTER-PAUSE")) == 1


def test_duplicate_capability_delivery_is_idempotent(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp("2026-09-27T20:00:00Z")
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    first_until = target.emergency_pause_protected_action(5, "INC-IDEMPOTENT", "EXC-IDEMPOTENT", "c" * 64, to_hex(direct_alice))
    replay_until = target.emergency_pause_protected_action(5, "INC-IDEMPOTENT", "EXC-IDEMPOTENT", "c" * 64, to_hex(direct_alice))
    status = json.loads(target.get_status_json())
    assert replay_until == first_until
    assert status["protected_action_paused_until"] == first_until
    assert len(target.list_emergency_history()) == 1
    assert target.get_applied_capability_digest("EXC-IDEMPOTENT") == "c" * 64


def test_conflicting_capability_replay_fails_closed(direct_vm, direct_deploy, direct_alice):
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    target.emergency_pause_protected_action(5, "INC-CONFLICT", "EXC-CONFLICT", "d" * 64, to_hex(direct_alice))
    with direct_vm.expect_revert("capability key is already bound to a different action"):
        target.emergency_pause_protected_action(5, "INC-CONFLICT", "EXC-CONFLICT", "e" * 64, to_hex(direct_alice))


def test_multiple_holders_remain_isolated(direct_vm, direct_deploy, direct_alice, direct_bob):
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    assert int(target.execute_protected_action("ALICE-ACTION")) == 1
    direct_vm.sender = direct_bob
    direct_vm.origin = direct_bob
    assert int(target.execute_protected_action("BOB-ACTION")) == 2
    assert json.loads(target.get_protected_action_json("ALICE-ACTION"))["holder"] == to_hex(direct_alice).lower()
    assert json.loads(target.get_protected_action_json("BOB-ACTION"))["holder"] == to_hex(direct_bob).lower()


def test_invalid_action_key_fails_closed(direct_vm, direct_deploy, direct_alice):
    target = deploy_target(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    with direct_vm.expect_revert("invalid protected action key"):
        target.execute_protected_action("")


def test_removed_payout_callback_and_payable_surface_are_not_present():
    source = open("contracts/protected_vault.py", encoding="utf-8").read()
    assert "__on_errored_message__" not in source
    assert "emit_transfer" not in source
    assert "def deposit" not in source
    assert "def withdraw" not in source
