import json
from tests.direct.conftest import to_hex


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
