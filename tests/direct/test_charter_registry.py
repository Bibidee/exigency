from tests.direct.conftest import to_hex


def _publish(contract, target, key="CHARTER-TEST-01", protocol="PROTO-TEST"):
    return contract.publish_charter(
        key,
        protocol,
        "Protected Test Protocol",
        target,
        "Emergency authority exists only when credible public evidence establishes an active exploit, critical dependency compromise, or material loss of asset-safety assumptions. Routine maintenance and operator assertion alone never qualify.",
        "Use approved public technical sources. Treat unavailable, stale, circular or materially contradictory evidence as insufficient rather than assuming an emergency exists.",
        "example.com,github.com",
        "PAUSE_WITHDRAWALS,PAUSE_ALL",
        90,
        30,
        1,
    )


def test_charter_is_immutable_and_delayed(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.warp("2026-09-27T20:00:00Z")
    contract = direct_deploy("contracts/charter_registry.py")
    _publish(contract, to_hex(direct_bob))

    assert contract.get_charter_json("CHARTER-TEST-01")
    assert contract.get_protocol_owner("PROTO-TEST") == to_hex(direct_alice)
    with direct_vm.expect_revert("charter activation delay has not elapsed"):
        contract.activate_charter("CHARTER-TEST-01")

    direct_vm.warp("2026-09-27T20:01:01Z")
    contract.activate_charter("CHARTER-TEST-01")
    assert contract.is_charter_active("CHARTER-TEST-01") is True

    with direct_vm.expect_revert("charter key already exists"):
        _publish(contract, to_hex(direct_bob))


def test_non_owner_cannot_activate(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    direct_vm.sender = direct_alice
    direct_vm.warp("2026-09-27T20:00:00Z")
    contract = direct_deploy("contracts/charter_registry.py")
    _publish(contract, to_hex(direct_bob))
    direct_vm.warp("2026-09-27T20:02:00Z")
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only charter owner may activate"):
        contract.activate_charter("CHARTER-TEST-01")


def test_protocol_key_cannot_be_hijacked_by_another_wallet(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/charter_registry.py")
    _publish(contract, to_hex(direct_bob), key="CHARTER-TEST-01")

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only protocol owner may publish a charter version"):
        _publish(contract, to_hex(direct_bob), key="CHARTER-TEST-02")


def test_active_charter_cannot_roll_back_to_older_version(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.warp("2026-09-27T20:00:00Z")
    contract = direct_deploy("contracts/charter_registry.py")
    _publish(contract, to_hex(direct_bob), key="CHARTER-TEST-01")
    direct_vm.warp("2026-09-27T20:02:00Z")
    contract.activate_charter("CHARTER-TEST-01")

    direct_vm.warp("2026-09-27T20:03:00Z")
    _publish(contract, to_hex(direct_bob), key="CHARTER-TEST-02")
    direct_vm.warp("2026-09-27T20:05:00Z")
    contract.activate_charter("CHARTER-TEST-02")
    assert contract.is_charter_active("CHARTER-TEST-02") is True

    with direct_vm.expect_revert("cannot roll back to an older charter version"):
        contract.activate_charter("CHARTER-TEST-01")
