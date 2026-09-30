import json

from tests.direct.conftest import to_hex


def _install_registry_hook(direct_vm, owner, *, scopes=None):
    charter = {
        "protocol_key": "PROTO-ENGINE-DIRECT",
        "protocol_name": "Engine Direct Test",
        "owner": to_hex(owner),
        "protected_target": to_hex(owner),
        "charter_digest": "a" * 64,
        "allowed_actions": ["PAUSE_WITHDRAWALS"],
        "max_pause_minutes": 30,
        "evidence_hosts": ["example.com"],
    }
    if scopes is not None:
        charter["evidence_scopes"] = scopes

    def hook(vm, request):
        from genlayer.py import calldata

        call = request["CallContract"]
        method = call["calldata"]["method"]
        if method == "get_charter_json":
            value = json.dumps(charter)
        elif method == "get_active_charter_key":
            value = "CHARTER-ENGINE-DIRECT"
        else:
            raise AssertionError(f"unexpected registry call: {method}")
        return b"\x00" + calldata.encode(value)

    direct_vm._gl_call_hook = hook


def _deploy_engine(direct_vm, direct_deploy, owner, *, scopes=None):
    _install_registry_hook(direct_vm, owner, scopes=scopes)
    return direct_deploy("contracts/exigency_engine.py", to_hex(owner), to_hex(owner))


def _open(engine, key, evidence):
    return engine.open_incident(
        key,
        "CHARTER-ENGINE-DIRECT",
        "PAUSE_WITHDRAWALS",
        5,
        "This incident reason is long enough to exercise the direct engine behavior.",
        json.dumps(evidence),
    )


def _assessment(decision, state="UNAVAILABLE"):
    return {
        "decision": decision,
        "summary": "Direct-mode adversarial assessment fixture.",
        "trigger_clauses": ["bounded trigger clause"],
        "material_findings": ["bounded source finding"],
        "source_states": [
            {
                "url": "https://example.com/evidence/primary",
                "state": state,
                "finding": "fixture source state",
            }
        ],
    }


def _prepare_assessment(direct_vm, direct_deploy, direct_alice, key, assessment):
    direct_vm.sender = direct_alice
    engine = _deploy_engine(direct_vm, direct_deploy, direct_alice)
    direct_vm.mock_web("example.com", {"method": "GET", "status": 200, "body": "approved evidence"})
    direct_vm.mock_llm("Return ONLY a JSON object", json.dumps(assessment))
    _open(engine, key, ["https://example.com/evidence/primary"])
    return engine


def test_incident_is_frozen_to_active_charter_and_owner(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    engine = _deploy_engine(direct_vm, direct_deploy, direct_alice)

    assert _open(engine, "INC-ENGINE-01", ["https://example.com/evidence/primary"]) == "INC-ENGINE-01"
    record = json.loads(engine.get_incident_json("INC-ENGINE-01"))
    assert record["charter_key"] == "CHARTER-ENGINE-DIRECT"
    assert record["charter_digest"] == "a" * 64
    assert record["evidence_urls"] == ["https://example.com/evidence/primary"]

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only charter owner may request emergency authority"):
        _open(engine, "INC-ENGINE-02", ["https://example.com/evidence/primary"])


def test_evidence_scope_rejects_dot_segments_and_prefix_lookalikes(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    engine = _deploy_engine(
        direct_vm,
        direct_deploy,
        direct_alice,
        scopes=[{"host": "example.com", "path_prefix": "/evidence/"}],
    )

    with direct_vm.expect_revert("evidence URL contains a dot path segment"):
        _open(engine, "INC-ENGINE-03", ["https://example.com/evidence/../private"])

    with direct_vm.expect_revert("evidence URL is outside the charter evidence scope"):
        _open(engine, "INC-ENGINE-04", ["https://example.com/evidence-escape/item"])


def test_duplicate_frozen_evidence_is_rejected(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    engine = _deploy_engine(direct_vm, direct_deploy, direct_alice)

    with direct_vm.expect_revert("duplicate evidence URL"):
        _open(
            engine,
            "INC-ENGINE-05",
            ["https://example.com/evidence/primary", "https://example.com/evidence/primary"],
        )


def test_validator_rejects_malicious_leader_decision(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-ENGINE-HOSTILE-01",
        _assessment("INSUFFICIENT_EVIDENCE"),
    )
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-ENGINE-HOSTILE-01")
    malicious = _assessment("TRIGGER_CONFIRMED", "SUPPORTS_TRIGGER")
    assert direct_vm.run_validator(leader_result=malicious) is False


def test_validator_rejects_source_classification_disagreement(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-ENGINE-HOSTILE-02",
        _assessment("INSUFFICIENT_EVIDENCE"),
    )
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-ENGINE-HOSTILE-02")
    disagreement = _assessment("INSUFFICIENT_EVIDENCE", "CONTRADICTS_TRIGGER")
    assert direct_vm.run_validator(leader_result=disagreement) is False


def test_missing_support_cannot_create_trigger_authority(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-ENGINE-HOSTILE-03",
        _assessment("TRIGGER_CONFIRMED", "UNAVAILABLE"),
    )
    direct_vm.sender = direct_alice
    result = engine.assess_incident("INC-ENGINE-HOSTILE-03")
    assert result["decision"] == "INSUFFICIENT_EVIDENCE"
    record = json.loads(engine.get_incident_json("INC-ENGINE-HOSTILE-03"))
    assert record["capability_key"] == ""
    assert record["status"] == "ASSESSMENT_RETRYABLE"


def test_conclusive_assessment_cannot_be_reassessed(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-ENGINE-CONCLUSIVE-01",
        _assessment("TRIGGER_NOT_CONFIRMED"),
    )
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-ENGINE-CONCLUSIVE-01")
    with direct_vm.expect_revert("incident already has a conclusive assessment"):
        engine.assess_incident("INC-ENGINE-CONCLUSIVE-01")


def test_retryable_assessment_stops_at_exact_max_attempts(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-ENGINE-RETRY-01",
        _assessment("INSUFFICIENT_EVIDENCE"),
    )
    direct_vm.sender = direct_alice
    for attempt in range(3):
        result = engine.assess_incident("INC-ENGINE-RETRY-01")
        assert result["decision"] == "INSUFFICIENT_EVIDENCE"
        record = json.loads(engine.get_incident_json("INC-ENGINE-RETRY-01"))
        assert record["assessment_count"] == attempt + 1
    with direct_vm.expect_revert("incident assessment retry limit exhausted"):
        engine.assess_incident("INC-ENGINE-RETRY-01")


def test_expired_incident_cannot_be_assessed(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp("2026-09-27T20:00:00Z")
    engine = _prepare_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-ENGINE-EXPIRY-01",
        _assessment("INSUFFICIENT_EVIDENCE"),
    )
    direct_vm.warp("2026-09-28T20:00:01Z")
    with direct_vm.expect_revert("incident assessment window has expired"):
        engine.assess_incident("INC-ENGINE-EXPIRY-01")
