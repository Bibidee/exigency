import json

from tests.direct.conftest import to_hex


def _install_registry_hook(direct_vm, owner, *, scopes=None, source_groups=None, target=None, challenge_window=0, maximum_challenges=0):
    charter = {
        "protocol_key": "PROTO-ENGINE-DIRECT",
        "protocol_name": "Engine Direct Test",
        "owner": to_hex(owner),
        "protected_target": target or to_hex(owner),
        "charter_digest": "a" * 64,
        "allowed_actions": ["PAUSE_PROTECTED_ACTION"],
        "max_pause_minutes": 30,
        "evidence_hosts": ["example.com", "github.com"],
    }
    if scopes is not None:
        charter["evidence_scopes"] = scopes
    if source_groups is not None:
        charter["source_groups"] = source_groups
        charter["minimum_source_groups"] = 2
        charter["challenge_window_minutes"] = challenge_window
        charter["maximum_challenges"] = maximum_challenges

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


def _install_v2_hook(
    direct_vm,
    owner,
    *,
    target_governance=None,
    challenge_window=10,
    maximum_challenges=1,
):
    """Install the smallest cross-contract surface needed by V2 tests."""
    target_governance = target_governance or owner
    charter = {
        "protocol_key": "PROTO-ENGINE-V2-DIRECT",
        "protocol_name": "Engine V2 Direct Test",
        "owner": to_hex(owner),
        "protected_target": to_hex(target_governance),
        "charter_digest": "a" * 64,
        "allowed_actions": ["PAUSE_PROTECTED_ACTION"],
        "max_pause_minutes": 30,
        "capability_ttl_minutes": 30,
        "evidence_hosts": ["example.com", "github.com"],
        "source_groups": [
            {"name": "official", "hosts": ["example.com"]},
            {"name": "independent", "hosts": ["github.com"]},
        ],
        "minimum_source_groups": 2,
        "challenge_window_minutes": challenge_window,
        "maximum_challenges": maximum_challenges,
    }
    messages = []

    def hook(vm, request):
        from genlayer.py import calldata

        call = request.get("CallContract")
        if call:
            method = call["calldata"]["method"]
            if method == "get_charter_json":
                value = json.dumps(charter)
            elif method == "get_active_charter_key":
                value = "CHARTER-ENGINE-V2-DIRECT"
            elif method == "get_governance_address":
                value = to_hex(target_governance)
            else:
                raise AssertionError(f"unexpected V2 registry/target call: {method}")
            return b"\x00" + calldata.encode(value)
        post = request.get("PostMessage")
        if post:
            messages.append(post)
            return None
        raise AssertionError(f"unexpected cross-contract request: {request}")

    direct_vm._gl_call_hook = hook
    direct_vm._v2_messages = messages
    return messages


def _deploy_v2_engine(
    direct_vm,
    direct_deploy,
    owner,
    *,
    target_governance=None,
    challenge_window=10,
    maximum_challenges=1,
):
    _install_v2_hook(
        direct_vm,
        owner,
        target_governance=target_governance,
        challenge_window=challenge_window,
        maximum_challenges=maximum_challenges,
    )
    return direct_deploy("contracts/exigency_engine.py", to_hex(owner), to_hex(owner))


def _v2_evidence():
    return [
        {"group": "official", "url": "https://example.com/evidence/primary"},
        {"group": "independent", "url": "https://github.com/Bibidee/exigency"},
    ]


def _v2_assessment(decision, state="SUPPORTS_TRIGGER"):
    return {
        "decision": decision,
        "summary": "Direct-mode V2 assessment fixture.",
        "trigger_clauses": ["bounded trigger clause"],
        "material_findings": ["bounded source finding"],
        "source_states": [
            {
                "url": "https://example.com/evidence/primary",
                "state": state,
                "finding": "fixture official source state",
            },
            {
                "url": "https://github.com/Bibidee/exigency",
                "state": state,
                "finding": "fixture independent source state",
            },
        ],
    }


def _prepare_v2_assessment(direct_vm, direct_deploy, direct_alice, key, assessment, **kwargs):
    direct_vm.warp("2026-09-27T20:00:00Z")
    engine = _deploy_v2_engine(direct_vm, direct_deploy, direct_alice, **kwargs)
    direct_vm.sender = direct_alice
    direct_vm.mock_web("example.com", {"method": "GET", "status": 200, "body": "approved official evidence"})
    direct_vm.mock_web("github.com", {"method": "GET", "status": 200, "body": "approved independent evidence"})
    direct_vm.mock_llm("Return ONLY a JSON object", json.dumps(assessment))
    _open(engine, key, _v2_evidence(), charter_key="CHARTER-ENGINE-V2-DIRECT")
    return engine


def _deploy_engine(direct_vm, direct_deploy, owner, *, scopes=None, source_groups=None, target=None, challenge_window=0, maximum_challenges=0):
    _install_registry_hook(direct_vm, owner, scopes=scopes, source_groups=source_groups, target=target, challenge_window=challenge_window, maximum_challenges=maximum_challenges)
    return direct_deploy("contracts/exigency_engine.py", to_hex(owner), to_hex(owner))


def _open(engine, key, evidence, charter_key="CHARTER-ENGINE-DIRECT"):
    return engine.open_incident(
        key,
        charter_key,
        "PAUSE_PROTECTED_ACTION",
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


def test_v2_evidence_requires_declared_distinct_source_groups(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    engine = _deploy_engine(
        direct_vm,
        direct_deploy,
        direct_alice,
        source_groups=[
            {"name": "official", "hosts": ["example.com"]},
            {"name": "independent", "hosts": ["github.com"]},
        ],
    )
    with direct_vm.expect_revert("minimum source-group diversity"):
        _open(engine, "INC-ENGINE-GROUP-01", [{"group": "official", "url": "https://example.com/evidence/primary"}])
    with direct_vm.expect_revert("does not belong to its declared source group"):
        _open(engine, "INC-ENGINE-GROUP-02", [{"group": "official", "url": "https://github.com/Bibidee/exigency"}, {"group": "independent", "url": "https://example.com/evidence/primary"}])
    assert _open(engine, "INC-ENGINE-GROUP-03", [
        {"group": "official", "url": "https://example.com/evidence/primary"},
        {"group": "independent", "url": "https://github.com/Bibidee/exigency"},
    ]) == "INC-ENGINE-GROUP-03"
    record = json.loads(engine.get_incident_json("INC-ENGINE-GROUP-03"))
    assert record["evidence_mode"] == "V2"
    assert {item["group"] for item in record["evidence_items"]} == {"official", "independent"}


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


def test_v2_provisional_confirmation_does_not_issue_authority(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-PROVISIONAL-01",
        _v2_assessment("TRIGGER_CONFIRMED"),
    )
    messages = direct_vm._v2_messages

    direct_vm.sender = direct_alice
    result = engine.assess_incident("INC-V2-PROVISIONAL-01")
    record = json.loads(engine.get_incident_json("INC-V2-PROVISIONAL-01"))
    assert result["decision"] == "TRIGGER_CONFIRMED"
    assert record["status"] == "ASSESSMENT_PROVISIONAL"
    assert record["assessment_stage"] == "PROVISIONAL"
    assert record["capability_key"] == ""
    assert messages == []


def test_v2_valid_challenge_is_frozen_and_unauthorized_challenge_rejected(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-CHALLENGE-01",
        _v2_assessment("TRIGGER_CONFIRMED"),
    )
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-V2-CHALLENGE-01")

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only the charter operator may submit a challenge"):
        engine.challenge_incident(
            "INC-V2-CHALLENGE-01",
            json.dumps(["https://github.com/Bibidee/exigency/CHALLENGE-SOURCE"]),
            "An unrelated wallet must not alter the frozen challenge evidence.",
        )

    direct_vm.sender = direct_alice
    engine.challenge_incident(
        "INC-V2-CHALLENGE-01",
        json.dumps(["https://github.com/Bibidee/exigency/CHALLENGE-SOURCE"]),
        "The independent source should be included in the bounded challenge review.",
    )
    record = json.loads(engine.get_incident_json("INC-V2-CHALLENGE-01"))
    assert record["status"] == "CHALLENGED"
    assert record["challenge_count"] == 1
    assert record["challenge_evidence_urls"] == ["https://github.com/Bibidee/exigency/CHALLENGE-SOURCE"]
    assert record["challenge_reasons"] == ["The independent source should be included in the bounded challenge review."]


def test_v2_challenge_after_deadline_is_rejected(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-DEADLINE-01",
        _v2_assessment("TRIGGER_CONFIRMED"),
    )
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-V2-DEADLINE-01")
    deadline = json.loads(engine.get_incident_json("INC-V2-DEADLINE-01"))["challenge_deadline"]
    assert deadline > 0
    direct_vm.warp("2026-09-27T20:11:00Z")
    with direct_vm.expect_revert("challenge window has closed"):
        engine.challenge_incident(
            "INC-V2-DEADLINE-01",
            json.dumps(["https://github.com/Bibidee/exigency/CHALLENGE-SOURCE"]),
            "This challenge is deliberately submitted after the deadline.",
        )


def test_v2_maximum_challenge_count_is_enforced(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-MAX-CHALLENGE-01",
        _v2_assessment("TRIGGER_CONFIRMED"),
        maximum_challenges=1,
    )
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-V2-MAX-CHALLENGE-01")
    engine.challenge_incident(
        "INC-V2-MAX-CHALLENGE-01",
        json.dumps(["https://github.com/Bibidee/exigency/CHALLENGE-ONE"]),
        "The first bounded challenge is accepted for review.",
    )
    with direct_vm.expect_revert("challenge limit exhausted"):
        engine.challenge_incident(
            "INC-V2-MAX-CHALLENGE-01",
            json.dumps(["https://github.com/Bibidee/exigency/CHALLENGE-TWO"]),
            "The second challenge must exceed the configured maximum.",
        )


def test_v2_finalization_before_deadline_is_rejected(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-EARLY-FINAL-01",
        _v2_assessment("TRIGGER_CONFIRMED"),
    )
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-V2-EARLY-FINAL-01")
    with direct_vm.expect_revert("challenge window is still open"):
        engine.finalize_incident("INC-V2-EARLY-FINAL-01")


def test_v2_final_confirmation_emits_only_finalized_capability(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-FINAL-01",
        _v2_assessment("TRIGGER_CONFIRMED"),
    )
    messages = direct_vm._v2_messages
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-V2-FINAL-01")
    record = json.loads(engine.get_incident_json("INC-V2-FINAL-01"))
    direct_vm.warp("2026-09-27T20:11:00Z")
    engine.finalize_incident("INC-V2-FINAL-01")
    record = json.loads(engine.get_incident_json("INC-V2-FINAL-01"))
    assert record["status"] == "AUTHORITY_PENDING_FINALITY"
    assert record["assessment_stage"] == "FINAL"
    assert record["capability_key"] == "EXC-INC-V2-FINAL-01"
    assert len(messages) == 1
    assert messages[0]["calldata"]["method"] == "issue_capability"
    assert messages[0]["on"] == "finalized"


def test_v2_final_reassessment_can_overturn_confirmation_without_authority(
    direct_vm, direct_deploy, direct_alice
):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-OVERTURNED-01",
        _v2_assessment("TRIGGER_CONFIRMED"),
    )
    messages = direct_vm._v2_messages
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-V2-OVERTURNED-01")
    record = json.loads(engine.get_incident_json("INC-V2-OVERTURNED-01"))
    direct_vm.warp("2026-09-27T20:11:00Z")
    direct_vm.clear_mocks()
    direct_vm.mock_web("example.com", {"method": "GET", "status": 200, "body": "changed evidence"})
    direct_vm.mock_web("github.com", {"method": "GET", "status": 200, "body": "changed independent evidence"})
    direct_vm.mock_llm("Return ONLY a JSON object", json.dumps(_v2_assessment("TRIGGER_NOT_CONFIRMED", "CONTRADICTS_TRIGGER")))
    engine.finalize_incident("INC-V2-OVERTURNED-01")
    record = json.loads(engine.get_incident_json("INC-V2-OVERTURNED-01"))
    assert record["status"] == "ASSESSED_NO_AUTHORITY"
    assert record["assessment_stage"] == "FINAL"
    assert record["capability_key"] == ""
    assert messages == []


def test_v2_source_drift_fails_closed(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-DRIFT-01",
        _v2_assessment("INSUFFICIENT_EVIDENCE", "UNAVAILABLE"),
        challenge_window=0,
        maximum_challenges=0,
    )
    direct_vm.sender = direct_alice
    first = engine.assess_incident("INC-V2-DRIFT-01")
    assert first["decision"] == "INSUFFICIENT_EVIDENCE"
    direct_vm.clear_mocks()
    direct_vm.mock_web("example.com", {"method": "GET", "status": 200, "body": "changed official evidence"})
    direct_vm.mock_web("github.com", {"method": "GET", "status": 200, "body": "changed independent evidence"})
    direct_vm.mock_llm("Return ONLY a JSON object", json.dumps(_v2_assessment("INSUFFICIENT_EVIDENCE", "UNAVAILABLE")))
    second = engine.assess_incident("INC-V2-DRIFT-01")
    record = json.loads(engine.get_incident_json("INC-V2-DRIFT-01"))
    assert second["drift_detected"] is True
    assert set(second["drifted_urls"]) == {"https://example.com/evidence/primary", "https://github.com/Bibidee/exigency"}
    assert second["decision"] == "CONFLICTING_EVIDENCE"
    assert record["capability_key"] == ""


def test_v2_identical_source_rounds_do_not_report_drift(direct_vm, direct_deploy, direct_alice):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-NO-DRIFT-01",
        _v2_assessment("INSUFFICIENT_EVIDENCE", "UNAVAILABLE"),
        challenge_window=0,
        maximum_challenges=0,
    )
    direct_vm.sender = direct_alice
    engine.assess_incident("INC-V2-NO-DRIFT-01")
    second = engine.assess_incident("INC-V2-NO-DRIFT-01")
    assert second["decision"] == "INSUFFICIENT_EVIDENCE"
    assert second.get("drift_detected", False) is False
    assert "drifted_urls" not in second


def test_unrelated_target_governance_cannot_create_authority_after_positive_assessment(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    engine = _prepare_v2_assessment(
        direct_vm,
        direct_deploy,
        direct_alice,
        "INC-V2-GOVERNANCE-01",
        _v2_assessment("TRIGGER_CONFIRMED"),
        target_governance=direct_bob,
        challenge_window=0,
        maximum_challenges=0,
    )
    messages = direct_vm._v2_messages
    direct_vm.sender = direct_alice
    result = engine.assess_incident("INC-V2-GOVERNANCE-01")
    record = json.loads(engine.get_incident_json("INC-V2-GOVERNANCE-01"))
    assert result["decision"] == "TRIGGER_CONFIRMED"
    assert result["authority_status"] == "TARGET_GOVERNANCE_REJECTED"
    assert record["status"] == "ASSESSED_NO_AUTHORITY"
    assert record["capability_key"] == ""
    assert messages == []
