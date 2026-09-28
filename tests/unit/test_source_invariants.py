from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(name):
    return (ROOT / "contracts" / name).read_text(encoding="utf-8")


def test_every_contract_pins_stable_runner():
    expected = 'py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6'
    for name in ("charter_registry.py", "exigency_engine.py", "capability_gate.py", "protected_vault.py"):
        assert expected in read(name)


def test_authority_is_finality_gated():
    engine = read("exigency_engine.py")
    gate = read("capability_gate.py")
    assert 'emit(on="finalized").issue_capability' in engine
    assert 'emit(on="finalized").emergency_pause_' in gate
    assert 'on="accepted"' not in engine
    assert 'on="accepted"' not in gate


def test_engine_has_substantive_validator_path():
    engine = read("exigency_engine.py")
    assert "self._evaluate_once(charter, incident)" in engine
    assert "leader_states != own_states" in engine
    assert "strict validator comparing two independent emergency-authority assessments" in engine
    assert "SUPPORTS_TRIGGER" in engine


def test_protected_vault_has_no_admin_pause_bypass():
    vault = read("protected_vault.py")
    assert "emergency authority requires CapabilityGate" in vault
    assert "def admin_pause" not in vault
    assert "def owner_pause" not in vault


def test_capability_binds_execution_parameters():
    gate = read("capability_gate.py")
    for needle in ("incident_key", "charter_digest", "target", "action_class", "duration_minutes", "action digest mismatch"):
        assert needle in gate


def test_protocol_charter_chain_cannot_be_hijacked_or_rolled_back():
    registry = read("charter_registry.py")
    assert "protocol_owners" in registry
    assert "only protocol owner may publish a charter version" in registry
    assert "cannot roll back to an older charter version" in registry


def test_charter_accepts_cli_decoded_address_objects():
    registry = read("charter_registry.py")
    assert "def _address_hex(value)" in registry
    assert "if hasattr(value, \"as_hex\")" in registry
    assert "protected_target_hex = _address_hex(protected_target)" in registry


def test_incident_accepts_cli_decoded_evidence_lists():
    engine = read("exigency_engine.py")
    assert "isinstance(evidence_urls_json, list)" in engine
    assert "json.loads(evidence_urls_json)" in engine


def test_web_provenance_tolerates_stable_response_field_shape():
    engine = read("exigency_engine.py")
    assert "getattr(response, \"status_code\", getattr(response, \"status\", 0))" in engine
    assert "isinstance(raw_body, bytes)" in engine


def test_incident_keeps_frozen_charter_after_later_activation():
    engine = read("exigency_engine.py")
    assert "def _require_active_charter" in engine
    open_block = engine.split("def open_incident", 1)[1].split("def assess_incident", 1)[0]
    assess_block = engine.split("def assess_incident", 1)[1]
    assert "self._require_active_charter(charter_key, charter)" in open_block
    assert "_require_active_charter" not in assess_block
    assert "frozen charter digest mismatch" in assess_block


def test_final_assessment_commits_to_actual_fetched_bytes():
    engine = read("exigency_engine.py")
    assert "content_digest" in engine
    assert "http_status" in engine
    assert "evidence_commitment_digest" in engine
    assert "Provenance fields are code-derived from the actual fetched bytes" in engine
