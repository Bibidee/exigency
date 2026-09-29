import json

from tests.direct.conftest import to_hex


def _publish_active(registry, target, owner):
    return registry.publish_charter(
        "CHARTER-ENGINE-01",
        "PROTO-ENGINE",
        "Engine Direct Test",
        to_hex(target),
        "Emergency authority exists only when credible public evidence establishes a material asset-safety incident and the requested response is proportionate.",
        "Use approved public technical evidence and fail closed when sources are unavailable or contradictory.",
        "example.com|/evidence/",
        "PAUSE_WITHDRAWALS",
        30,
        10,
        1,
    )


def test_incident_is_frozen_to_active_charter_and_owner(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.warp("2026-09-27T20:00:00Z")
    registry = direct_deploy("contracts/charter_registry.py")
    _publish_active(registry, direct_bob, direct_alice)
    direct_vm.warp("2026-09-27T20:01:01Z")
    registry.activate_charter("CHARTER-ENGINE-01")
    engine = direct_deploy("contracts/exigency_engine.py", to_hex(registry.address), to_hex(direct_bob))

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only charter owner may request emergency authority"):
        engine.open_incident(
            "INC-ENGINE-01",
            "CHARTER-ENGINE-01",
            "PAUSE_WITHDRAWALS",
            5,
            "This incident reason is long enough to exercise the actual direct-mode authorization path.",
            json.dumps(["https://example.com/evidence/primary"]),
        )

    direct_vm.sender = direct_alice
    assert engine.open_incident(
        "INC-ENGINE-01",
        "CHARTER-ENGINE-01",
        "PAUSE_WITHDRAWALS",
        5,
        "This incident reason is long enough to exercise the actual direct-mode authorization path.",
        json.dumps(["https://example.com/evidence/primary"]),
    ) == "INC-ENGINE-01"
    record = json.loads(engine.get_incident_json("INC-ENGINE-01"))
    assert record["charter_digest"]
    assert record["action_digest"]
    assert record["evidence_urls"] == ["https://example.com/evidence/primary"]

    with direct_vm.expect_revert("incident key already exists"):
        engine.open_incident(
            "INC-ENGINE-01",
            "CHARTER-ENGINE-01",
            "PAUSE_WITHDRAWALS",
            5,
            "This incident reason is long enough to exercise the duplicate-key path.",
            json.dumps(["https://example.com/evidence/primary"]),
        )


def test_evidence_scope_rejects_dot_segments_and_prefix_lookalikes(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    direct_vm.warp("2026-09-27T20:00:00Z")
    registry = direct_deploy("contracts/charter_registry.py")
    _publish_active(registry, direct_bob, direct_alice)
    direct_vm.warp("2026-09-27T20:01:01Z")
    registry.activate_charter("CHARTER-ENGINE-01")
    engine = direct_deploy("contracts/exigency_engine.py", to_hex(registry.address), to_hex(direct_bob))
    with direct_vm.expect_revert("evidence URL contains a dot path segment"):
        engine.open_incident(
            "INC-ENGINE-02",
            "CHARTER-ENGINE-01",
            "PAUSE_WITHDRAWALS",
            5,
            "This incident reason is long enough to exercise canonical evidence path rejection.",
            json.dumps(["https://example.com/evidence/../private"]),
        )
