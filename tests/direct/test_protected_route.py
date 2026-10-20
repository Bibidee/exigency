import json

from tests.direct.conftest import to_hex


def deploy_route(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    return direct_deploy("contracts/protected_route.py", to_hex(direct_bob))


def test_route_uses_same_gate_and_governance_boundary(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    route = deploy_route(direct_vm, direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("emergency authority requires CapabilityGate"):
        route.apply_emergency_action("DISABLE_PROTECTED_ROUTE", 5, "INC-ROUTE-01", "EXC-ROUTE-01", "a" * 64, to_hex(direct_alice))

    direct_vm.sender = direct_bob
    route.apply_emergency_action("DISABLE_PROTECTED_ROUTE", 5, "INC-ROUTE-01", "EXC-ROUTE-01", "a" * 64, to_hex(direct_alice))
    status = json.loads(route.get_status_json())
    assert status["route_disabled"] is True

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("protected route is temporarily disabled"):
        route.execute_route("ROUTE-01")


def test_route_rejects_wrong_governance_holder_and_replay(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    route = deploy_route(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("target governance rejected capability holder"):
        route.apply_emergency_action("DISABLE_PROTECTED_ROUTE", 5, "INC-ROUTE-02", "EXC-ROUTE-02", "b" * 64, to_hex(direct_charlie))

    route.apply_emergency_action("DISABLE_PROTECTED_ROUTE", 5, "INC-ROUTE-02", "EXC-ROUTE-02", "b" * 64, to_hex(direct_alice))
    assert route.apply_emergency_action("DISABLE_PROTECTED_ROUTE", 5, "INC-ROUTE-02", "EXC-ROUTE-02", "b" * 64, to_hex(direct_alice)) > 0
    with direct_vm.expect_revert("capability key is already bound to a different action"):
        route.apply_emergency_action("DISABLE_PROTECTED_ROUTE", 5, "INC-ROUTE-02", "EXC-ROUTE-02", "c" * 64, to_hex(direct_alice))
