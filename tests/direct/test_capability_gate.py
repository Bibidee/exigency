import json
from tests.direct.conftest import to_hex


def _issue(gate, direct_vm, direct_bob, key="EXC-ENVELOPE"):
    direct_vm.sender = direct_bob
    gate.issue_capability(
        key,
        "INC-ENVELOPE",
        to_hex(direct_bob),
        to_hex(direct_bob),
        "PAUSE_ALL",
        30,
        "a" * 64,
        "b" * 64,
        "c" * 64,
        1800,
    )
    return json.loads(gate.get_capability_json(key))


def _bound_gate(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    gate = direct_deploy("contracts/capability_gate.py")
    gate.bind_engine(to_hex(direct_bob))
    return gate


def test_only_bound_engine_can_issue(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    direct_vm.sender = direct_alice
    gate = direct_deploy("contracts/capability_gate.py")
    gate.bind_engine(to_hex(direct_bob))

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only bound ExigencyEngine may issue capabilities"):
        gate.issue_capability("EXC-TEST", "INC-TEST", to_hex(direct_charlie), to_hex(direct_alice), "PAUSE_ALL", 30, "a"*64, "b"*64, "c"*64, 1800)

    direct_vm.sender = direct_bob
    gate.issue_capability("EXC-TEST", "INC-TEST", to_hex(direct_charlie), to_hex(direct_alice), "PAUSE_ALL", 30, "a"*64, "b"*64, "c"*64, 1800)
    record = json.loads(gate.get_capability_json("EXC-TEST"))
    assert record["holder"] == to_hex(direct_charlie)
    assert record["consumed"] is False


def test_engine_binding_is_one_time(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    direct_vm.sender = direct_alice
    gate = direct_deploy("contracts/capability_gate.py")
    gate.bind_engine(to_hex(direct_bob))
    with direct_vm.expect_revert("engine already bound"):
        gate.bind_engine(to_hex(direct_charlie))


def test_execution_envelope_rejects_wrong_holder_target_action_duration_and_digest(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    gate = _bound_gate(direct_vm, direct_deploy, direct_alice, direct_bob)
    _issue(gate, direct_vm, direct_bob)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only capability holder may execute"):
        gate.execute_capability("EXC-ENVELOPE", to_hex(direct_bob), "PAUSE_ALL", 30)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("target does not match capability"):
        gate.execute_capability("EXC-ENVELOPE", to_hex(direct_charlie), "PAUSE_ALL", 30)
    with direct_vm.expect_revert("action does not match capability"):
        gate.execute_capability("EXC-ENVELOPE", to_hex(direct_bob), "PAUSE_WITHDRAWALS", 30)
    with direct_vm.expect_revert("duration does not match capability"):
        gate.execute_capability("EXC-ENVELOPE", to_hex(direct_bob), "PAUSE_ALL", 29)
    with direct_vm.expect_revert("action digest mismatch"):
        gate.execute_capability("EXC-ENVELOPE", to_hex(direct_bob), "PAUSE_ALL", 30)


def test_expiry_blocks_first_dispatch_but_reconcile_is_idempotent_before_dispatch(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.warp("2026-09-27T20:00:00Z")
    gate = _bound_gate(direct_vm, direct_deploy, direct_alice, direct_bob)
    _issue(gate, direct_vm, direct_bob, key="EXC-EXPIRY")
    direct_vm.warp("2026-09-27T20:30:01Z")
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("capability expired"):
        gate.execute_capability("EXC-EXPIRY", to_hex(direct_bob), "PAUSE_ALL", 30)
    assert gate.reconcile_capability("EXC-EXPIRY") == "ISSUED"
    assert json.loads(gate.get_capability_json("EXC-EXPIRY"))["dispatch_count"] == 0
