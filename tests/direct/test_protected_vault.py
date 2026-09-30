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


def test_zero_withdrawal_is_rejected(direct_vm, direct_deploy, direct_alice):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("withdraw amount must be greater than zero"):
        vault.withdraw(0)


def test_sender_origin_mismatch_fails_closed(direct_vm, direct_deploy, direct_alice, direct_bob):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    direct_vm.sender = direct_bob
    direct_vm.origin = direct_alice
    direct_vm.value = 10**16
    with direct_vm.expect_revert("vault credit flows require a direct EOA caller"):
        vault.deposit()
    direct_vm.value = 0
    with direct_vm.expect_revert("vault credit flows require a direct EOA caller"):
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


def test_duplicate_pause_classes_do_not_extend_after_time_advance(direct_vm, direct_deploy, direct_alice):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    direct_vm.sender = direct_alice
    for index, (action, method) in enumerate(
        (
            ("PAUSE_WITHDRAWALS", "emergency_pause_withdrawals"),
            ("PAUSE_DEPOSITS", "emergency_pause_deposits"),
            ("PAUSE_ALL", "emergency_pause_all"),
        )
    ):
        direct_vm.warp(f"2026-09-27T20:{index * 10:02d}:00Z")
        first = getattr(vault, method)(10, "INC-" + action, "EXC-" + action, "d" * 64)
        direct_vm.warp(f"2026-09-27T20:{index * 10 + 5:02d}:00Z")
        replay = getattr(vault, method)(10, "INC-" + action, "EXC-" + action, "d" * 64)
        assert replay == first
        assert len(vault.list_emergency_history()) == index + 1


def test_failed_payout_restores_credit_and_retry_is_single_record(direct_vm, direct_deploy, direct_alice):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 10**16
    direct_vm.sender = direct_alice
    direct_vm.value = amount
    vault.deposit()
    direct_vm.value = 0
    assert int(vault.withdraw(amount)) == 0
    withdrawal_id = vault.list_withdrawal_keys()[0]
    assert json.loads(vault.get_withdrawal_json(withdrawal_id))["status"] == "DISPATCHED"
    direct_vm.value = amount
    vault.__on_errored_message__()
    direct_vm.value = 0
    direct_vm.origin = direct_alice
    assert int(vault.get_credit(to_hex(direct_alice))) == amount
    failed = json.loads(vault.get_withdrawal_json(withdrawal_id))
    assert failed["status"] == "FAILED_RECOVERABLE"
    direct_vm.value = 0
    assert vault.retry_withdrawal(withdrawal_id) == "DISPATCHED"
    assert json.loads(vault.get_withdrawal_json(withdrawal_id))["retry_count"] == 1


def test_settled_withdrawal_cannot_be_replayed(direct_vm, direct_deploy, direct_alice):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    direct_vm.sender = direct_alice
    direct_vm.value = 10**16
    vault.deposit()
    direct_vm.value = 0
    vault.withdraw(10**16)
    withdrawal_id = vault.list_withdrawal_keys()[0]
    assert vault.settle_withdrawal(withdrawal_id) == "ACKNOWLEDGED"
    assert vault.settle_withdrawal(withdrawal_id) == "ACKNOWLEDGED"
    assert vault.get_active_withdrawal_key(to_hex(direct_alice)) == ""
    with direct_vm.expect_revert("withdrawal is not recoverable"):
        vault.retry_withdrawal(withdrawal_id)


def test_settlement_before_child_resolution_preserves_refund_recovery(direct_vm, direct_deploy, direct_alice):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 10**16
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = amount
    vault.deposit()
    direct_vm.value = 0
    vault.withdraw(amount)
    withdrawal_id = vault.get_active_withdrawal_key(to_hex(direct_alice))

    # A direct holder acknowledgement must release the active lock without
    # deleting the callback correlation.
    assert vault.settle_withdrawal(withdrawal_id) == "ACKNOWLEDGED"
    settled = json.loads(vault.get_withdrawal_json(withdrawal_id))
    assert settled["status"] == "ACKNOWLEDGED"
    assert vault.get_active_withdrawal_key(to_hex(direct_alice)) == ""
    assert vault.get_recovery_withdrawal_keys(to_hex(direct_alice)) == [withdrawal_id]

    # A late child failure still restores exactly once and invalidates the
    # provisional settlement rather than losing the holder's credit.
    direct_vm.value = amount
    vault.__on_errored_message__()
    direct_vm.value = 0
    failed = json.loads(vault.get_withdrawal_json(withdrawal_id))
    assert failed["status"] == "FAILED_RECOVERABLE"
    assert int(vault.get_credit(to_hex(direct_alice))) == amount
    assert int(json.loads(vault.get_status_json())["total_credits"]) == amount

    # Duplicate failure delivery is idempotent and cannot double-credit.
    direct_vm.value = amount
    with direct_vm.expect_revert("errored payout has no active holder withdrawal"):
        vault.__on_errored_message__()
    direct_vm.value = 0
    assert int(vault.get_credit(to_hex(direct_alice))) == amount


def test_pending_withdrawal_is_scoped_to_holder(direct_vm, direct_deploy, direct_alice, direct_bob):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 10**16

    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = amount
    vault.deposit()
    direct_vm.sender = direct_bob
    direct_vm.origin = direct_bob
    direct_vm.value = amount
    vault.deposit()

    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = 0
    vault.withdraw(amount // 2)
    alice_key = vault.get_active_withdrawal_key(to_hex(direct_alice))
    assert alice_key

    # Alice's unresolved payout no longer freezes Bob.
    direct_vm.sender = direct_bob
    direct_vm.origin = direct_bob
    assert int(vault.withdraw(amount // 2)) == amount // 2
    bob_key = vault.get_active_withdrawal_key(to_hex(direct_bob))
    assert bob_key and bob_key != alice_key

    # The refund callback uses origin, so Alice's failure cannot alter Bob.
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = amount // 2
    vault.__on_errored_message__()
    direct_vm.value = 0
    assert int(vault.get_credit(to_hex(direct_alice))) == amount
    assert int(vault.get_credit(to_hex(direct_bob))) == amount // 2
    assert json.loads(vault.get_withdrawal_json(alice_key))["status"] == "FAILED_RECOVERABLE"
    assert json.loads(vault.get_withdrawal_json(bob_key))["status"] == "DISPATCHED"


def test_retry_preserves_holder_correlation_and_conservation(direct_vm, direct_deploy, direct_alice, direct_bob):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 10**16
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = amount
    vault.deposit()
    direct_vm.sender = direct_bob
    direct_vm.origin = direct_bob
    direct_vm.value = amount
    vault.deposit()

    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = 0
    vault.withdraw(amount)
    alice_key = vault.get_active_withdrawal_key(to_hex(direct_alice))
    direct_vm.value = amount
    vault.__on_errored_message__()
    direct_vm.value = 0
    assert vault.retry_withdrawal(alice_key) == "DISPATCHED"
    assert vault.get_active_withdrawal_key(to_hex(direct_alice)) == alice_key

    # Bob's credit and the total remain isolated while Alice retries.
    assert int(vault.get_credit(to_hex(direct_bob))) == amount
    assert int(json.loads(vault.get_status_json())["total_credits"]) == 2 * amount - amount


def test_three_successful_withdrawals_same_holder_are_reusable(direct_vm, direct_deploy, direct_alice):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 10**16
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = 3 * amount
    vault.deposit()
    direct_vm.value = 0

    withdrawal_ids = []
    for expected_credit in (2 * amount, amount, 0):
        assert int(vault.withdraw(amount)) == expected_credit
        withdrawal_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
        assert withdrawal_id and withdrawal_id not in withdrawal_ids
        withdrawal_ids.append(withdrawal_id)
        assert vault.settle_withdrawal(withdrawal_id) == "ACKNOWLEDGED"
        assert vault.get_active_withdrawal_key(to_hex(direct_alice)) == ""
        assert json.loads(vault.get_withdrawal_json(withdrawal_id))["status"] == "ACKNOWLEDGED"

    assert len(set(withdrawal_ids)) == 3
    assert int(vault.get_credit(to_hex(direct_alice))) == 0
    assert int(json.loads(vault.get_status_json())["total_credits"]) == 0
    assert vault.list_withdrawal_keys() == withdrawal_ids


def test_late_failure_after_acknowledgement_restores_exact_record_and_allows_next_payout(
    direct_vm, direct_deploy, direct_alice
):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 10**16
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = 2 * amount
    vault.deposit()
    direct_vm.value = 0

    vault.withdraw(amount)
    first_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
    vault.settle_withdrawal(first_id)
    vault.withdraw(amount)
    second_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
    assert second_id != first_id

    # The active second payout must win over the older acknowledged candidate.
    direct_vm.value = amount
    vault.__on_errored_message__()
    direct_vm.value = 0
    assert json.loads(vault.get_withdrawal_json(first_id))["status"] == "ACKNOWLEDGED"
    assert json.loads(vault.get_withdrawal_json(second_id))["status"] == "FAILED_RECOVERABLE"
    assert int(vault.get_credit(to_hex(direct_alice))) == amount
    assert int(json.loads(vault.get_status_json())["total_credits"]) == amount

    # The older acknowledged child can still fail later and now has a unique
    # remaining recovery candidate.
    direct_vm.value = amount
    vault.__on_errored_message__()
    direct_vm.value = 0
    assert json.loads(vault.get_withdrawal_json(first_id))["status"] == "FAILED_RECOVERABLE"
    assert int(vault.get_credit(to_hex(direct_alice))) == 2 * amount
    assert int(json.loads(vault.get_status_json())["total_credits"]) == 2 * amount


def test_different_amount_failure_recovers_active_record_not_acknowledged_record(
    direct_vm, direct_deploy, direct_alice
):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    first_amount = 5 * 10**15
    second_amount = 7 * 10**15
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = first_amount + second_amount
    vault.deposit()
    direct_vm.value = 0

    vault.withdraw(first_amount)
    first_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
    vault.settle_withdrawal(first_id)
    vault.withdraw(second_amount)
    second_id = vault.get_active_withdrawal_key(to_hex(direct_alice))

    direct_vm.value = second_amount
    vault.__on_errored_message__()
    direct_vm.value = 0

    assert json.loads(vault.get_withdrawal_json(first_id))["status"] == "ACKNOWLEDGED"
    assert json.loads(vault.get_withdrawal_json(second_id))["status"] == "FAILED_RECOVERABLE"
    assert int(vault.get_credit(to_hex(direct_alice))) == second_amount
    assert vault.get_active_withdrawal_key(to_hex(direct_alice)) == ""


def test_ambiguous_acknowledged_same_amount_failure_fails_closed(
    direct_vm, direct_deploy, direct_alice
):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 5 * 10**15
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = 2 * amount
    vault.deposit()
    direct_vm.value = 0

    vault.withdraw(amount)
    first_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
    vault.settle_withdrawal(first_id)
    vault.withdraw(amount)
    second_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
    vault.settle_withdrawal(second_id)

    direct_vm.value = amount
    with direct_vm.expect_revert("ambiguous acknowledged payout recovery"):
        vault.__on_errored_message__()
    direct_vm.value = 0

    assert json.loads(vault.get_withdrawal_json(first_id))["status"] == "ACKNOWLEDGED"
    assert json.loads(vault.get_withdrawal_json(second_id))["status"] == "ACKNOWLEDGED"
    assert int(vault.get_credit(to_hex(direct_alice))) == 0
    assert int(json.loads(vault.get_status_json())["total_credits"]) == 0
    assert vault.get_recovery_withdrawal_keys(to_hex(direct_alice)) == [first_id, second_id]


def test_acknowledged_recovery_candidates_are_bounded(
    direct_vm, direct_deploy, direct_alice
):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 10**12
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = 33 * amount
    vault.deposit()
    direct_vm.value = 0

    for _ in range(32):
        vault.withdraw(amount)
        withdrawal_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
        assert vault.settle_withdrawal(withdrawal_id) == "ACKNOWLEDGED"

    vault.withdraw(amount)
    withdrawal_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
    with direct_vm.expect_revert("too many unresolved acknowledged payouts"):
        vault.settle_withdrawal(withdrawal_id)
    assert len(vault.get_recovery_withdrawal_keys(to_hex(direct_alice))) == 32


def test_retry_failure_restores_same_record_exactly_once(
    direct_vm, direct_deploy, direct_alice
):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 5 * 10**15
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = amount
    vault.deposit()
    direct_vm.value = 0
    vault.withdraw(amount)
    withdrawal_id = vault.get_active_withdrawal_key(to_hex(direct_alice))

    direct_vm.value = amount
    vault.__on_errored_message__()
    direct_vm.value = 0
    assert vault.retry_withdrawal(withdrawal_id) == "DISPATCHED"

    direct_vm.value = amount
    vault.__on_errored_message__()
    direct_vm.value = 0
    failed = json.loads(vault.get_withdrawal_json(withdrawal_id))
    assert failed["status"] == "FAILED_RECOVERABLE"
    assert failed["retry_count"] == 1
    assert vault.get_active_withdrawal_key(to_hex(direct_alice)) == ""
    assert vault.get_recovery_withdrawal_keys(to_hex(direct_alice)) == []
    assert int(vault.get_credit(to_hex(direct_alice))) == amount
    assert int(json.loads(vault.get_status_json())["total_credits"]) == amount

    direct_vm.value = amount
    with direct_vm.expect_revert("errored payout has no active holder withdrawal"):
        vault.__on_errored_message__()
    direct_vm.value = 0
    assert int(vault.get_credit(to_hex(direct_alice))) == amount


def test_second_same_amount_failure_does_not_corrupt_first_acknowledged_withdrawal(
    direct_vm, direct_deploy, direct_alice
):
    vault = direct_deploy("contracts/protected_vault.py", to_hex(direct_alice))
    amount = 5 * 10**15
    direct_vm.sender = direct_alice
    direct_vm.origin = direct_alice
    direct_vm.value = 3 * amount
    vault.deposit()
    direct_vm.value = 0

    vault.withdraw(amount)
    first_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
    assert vault.settle_withdrawal(first_id) == "ACKNOWLEDGED"

    vault.withdraw(amount)
    second_id = vault.get_active_withdrawal_key(to_hex(direct_alice))
    assert second_id != first_id

    direct_vm.value = amount
    vault.__on_errored_message__()
    direct_vm.value = 0

    assert json.loads(vault.get_withdrawal_json(first_id))["status"] == "ACKNOWLEDGED"
    assert json.loads(vault.get_withdrawal_json(second_id))["status"] == "FAILED_RECOVERABLE"
    assert int(vault.get_credit(to_hex(direct_alice))) == 2 * amount
    assert int(json.loads(vault.get_status_json())["total_credits"]) == 2 * amount
    assert vault.get_active_withdrawal_key(to_hex(direct_alice)) == ""

    assert vault.retry_withdrawal(second_id) == "DISPATCHED"
    with direct_vm.expect_revert("withdrawal is not recoverable"):
        vault.retry_withdrawal(first_id)
