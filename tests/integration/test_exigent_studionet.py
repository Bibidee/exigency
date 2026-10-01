"""Opt-in live Studionet smoke checks.

These checks use the repository-local GenLayer CLI and the deployed manifest;
they do not mock contract state. The read-only check is safe for CI, while the
complete write lifecycle is explicitly opt-in because it creates fresh
on-chain records and consumes a funded, unlocked account.
"""

import json
import os
import subprocess
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "deployment-manifest.public.json"
CLI = ["node", str(ROOT / "node_modules" / "genlayer" / "dist" / "index.js")] if os.name == "nt" else ["npx", "--no-install", "genlayer"]


pytestmark = pytest.mark.skipif(
    os.environ.get("EXIGENT_RUN_LIVE_INTEGRATION") != "1",
    reason="set EXIGENT_RUN_LIVE_INTEGRATION=1 to query live Studionet",
)


def _cli_call(address: str, method: str, *args: str) -> str:
    for attempt in range(6):
        command = [
            *CLI,
            "call",
            address,
            method,
            "--rpc",
            "https://studio.genlayer.com/api",
        ]
        if args:
            command.extend(["--args", *args])
        result = subprocess.run(
            command,
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
            shell=False,
        )
        marker = "Result:\n"
        if marker in result.stdout:
            lines = [line.strip() for line in result.stdout.split(marker, 1)[1].splitlines() if line.strip()]
            for value in reversed(lines):
                if value.startswith(("{", "[", '"')):
                    return value
        if attempt < 5:
            __import__("time").sleep(3)
    raise AssertionError(f"CLI did not return a non-empty result for {method}")


def _cli_write(address: str, method: str, *args: str) -> str:
    command = [
        *CLI,
        "write",
        address,
        method,
        "--rpc",
        "https://studio.genlayer.com/api",
    ]
    if args:
        encoded = [arg if arg.lstrip().startswith(("[", "{")) else json.dumps(arg) if any(ch.isspace() for ch in arg) else arg for arg in args]
        command.extend(["--args", *encoded])
    result = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
        shell=False,
    )
    return f"{result.stdout}\n{result.stderr}"


def _finalize(stdout: str) -> str:
    marker = "Write Transaction Hash:"
    assert marker in stdout, stdout
    tx_hash = stdout.split(marker, 1)[1].strip().splitlines()[0].strip()
    assert tx_hash.startswith("0x"), stdout
    _finalize_hash(tx_hash)
    return tx_hash


def _finalize_hash(tx_hash: str) -> None:
    command = ["node", str(ROOT / "scripts" / "wait-finalized.mjs"), tx_hash]
    result = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        shell=False,
    )
    if result.returncode:
        raise AssertionError(
            f"Studionet transaction did not reach FINALIZED: {tx_hash}\n"
            f"{result.stdout}\n{result.stderr}"
        )


def _triggered_children(parent_hash: str) -> list[str]:
    retries = int(os.environ.get("EXIGENT_LIVE_CHILD_RETRIES", "60"))
    interval = float(os.environ.get("EXIGENT_LIVE_CHILD_INTERVAL", "2"))
    for attempt in range(retries):
        result = subprocess.run(
            ["node", str(ROOT / "scripts" / "triggered-transactions.mjs"), parent_hash],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
            shell=False,
        )
        children = json.loads(result.stdout.strip().splitlines()[-1])
        if children:
            return children
        if attempt < retries - 1:
            __import__("time").sleep(interval)
    raise AssertionError(f"no child transaction was discovered for {parent_hash}")


def test_live_studionet_manifest_and_contract_reads():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["network"] == "studionet"
    assert manifest["chainId"] == 61999
    assert manifest["rpc"] == "https://studio.genlayer.com/api"

    contracts = manifest["contracts"]
    assert _cli_call(contracts["charterRegistry"], "list_charter_keys")
    status = json.loads(_cli_call(contracts["protectedVault"], "get_status_json"))
    assert status["gate_address"].lower() == contracts["capabilityGate"].lower()
    assert isinstance(status["protected_action_paused"], bool)
    assert isinstance(status["protected_action_count"], str)


@pytest.mark.skipif(
    os.environ.get("EXIGENT_RUN_LIVE_PROTECTED_ACTION") != "1",
    reason="set EXIGENT_RUN_LIVE_PROTECTED_ACTION=1 with EXIGENT_LIVE_PRIVATE_KEY for protected-target coverage",
)
def test_live_studionet_protected_action():
    """Exercise the real non-custodial protected target with an unlocked key."""
    command = ["node", str(ROOT / "scripts" / "live-vault-accounting.mjs")]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=True)
    payload = json.loads(result.stdout.strip().splitlines()[-1])
    assert payload["parentHash"].startswith("0x")
    assert int(payload["afterCount"]) == int(payload["beforeCount"]) + 1
    assert payload["valueCustody"] == "NONE"


@pytest.mark.skipif(
    os.environ.get("EXIGENT_RUN_LIVE_LIFECYCLE") != "1",
    reason="set EXIGENT_RUN_LIVE_LIFECYCLE=1 with an unlocked CLI account",
)
def test_live_studionet_lifecycle_writes():
    """Run the complete authority path with real finalized Studionet writes.

    This is deliberately opt-in: it creates fresh on-chain charter and
    incident records and invokes GenLayer consensus, so it is unsuitable for
    every pull request. The account must already be unlocked in the CLI.
    """
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    contracts = manifest["contracts"]
    stamp = str(int(__import__("time").time()))
    charter = f"CI-LIVE-{stamp}"
    incident = f"CI-INC-{stamp}"
    protocol = f"CI-PROTOCOL-{stamp}"
    target = contracts["protectedVault"]
    sources = [
        "https://raw.githubusercontent.com/Bibidee/exigency/84de2b15e428497bc6dec64aedf54d1ee1c06761/demo/evidence/active_incident_primary.md",
        "https://raw.githubusercontent.com/Bibidee/exigency/84de2b15e428497bc6dec64aedf54d1ee1c06761/demo/evidence/active_incident_secondary.md",
    ]

    _finalize(_cli_write(
        contracts["charterRegistry"],
        "publish_charter",
        charter, protocol, "EXIGENT CI", target,
        "SYNTHETIC TEST ONLY: trigger when approved public synthetic evidence confirms an active fictional security incident affecting protected-action assumptions and supports a proportionate temporary protected-action pause. Never treat this fixture as a real incident.",
            "Approved public synthetic test fixtures are acceptable only when retrievable, corroborated, current, and explicitly describe the fictional active incident and affected protected-action path.",
        "raw.githubusercontent.com", "PAUSE_PROTECTED_ACTION", "5", "30", "1",
    ))
    import time
    time.sleep(70)
    _finalize(_cli_write(contracts["charterRegistry"], "activate_charter", charter))
    _finalize(_cli_write(
        contracts["exigencyEngine"], "open_incident", incident, charter,
        "PAUSE_PROTECTED_ACTION", "5",
        "Automated live integration incident verifying source-grounded emergency authority and exact capability execution.",
        json.dumps(sources),
    ))
    assessment_hash = _finalize(_cli_write(contracts["exigencyEngine"], "assess_incident", incident))
    assessment_children = _triggered_children(assessment_hash)
    assert assessment_children, "assessment did not emit the finalized capability issuance child"
    for child_hash in assessment_children:
        _finalize_hash(child_hash)
    record = {}
    for _ in range(36):
        record = json.loads(_cli_call(contracts["exigencyEngine"], "get_incident_json", incident))
        # The parent assessment stores AUTHORITY_PENDING_FINALITY immediately;
        # the capability is issued only by the finalized child message.
        if record.get("status") == "AUTHORITY_PENDING_FINALITY" and record.get("capability_key"):
            break
        time.sleep(5)
    assert record["status"] == "AUTHORITY_PENDING_FINALITY"
    assert record["capability_key"]
    assessment = json.loads(record["assessment_json"])
    assert assessment["decision"] == "TRIGGER_CONFIRMED"
    assert assessment["incident_digest"] == record["incident_digest"]
    assert assessment["charter_digest"] == record["charter_digest"]
    capability = {}
    for _ in range(36):
        raw = _cli_call(contracts["capabilityGate"], "get_capability_json", record["capability_key"])
        if raw:
            capability = json.loads(raw)
            if capability.get("issued_at", 0):
                break
        time.sleep(5)
    assert capability.get("issued_at", 0), "capability child did not finalize"
    before_action_key = f"LIVE-ACTION-{stamp}-BEFORE"
    before_action_hash = _finalize(_cli_write(contracts["protectedVault"], "execute_protected_action", before_action_key))
    before_action_record = json.loads(_cli_call(contracts["protectedVault"], "get_protected_action_json", before_action_key))
    assert before_action_record["action_key"] == before_action_key
    execute_output = _cli_write(
        contracts["capabilityGate"], "execute_capability", capability["capability_key"],
        capability["target"], capability["action_class"], str(capability["duration_minutes"]),
    )
    execute_hash = execute_output.split("Write Transaction Hash:", 1)[1].strip().splitlines()[0].strip()
    _finalize_hash(execute_hash)
    child_hashes = _triggered_children(execute_hash)
    for child_hash in child_hashes:
        _finalize_hash(child_hash)
    dispatched = json.loads(_cli_call(contracts["capabilityGate"], "get_capability_json", capability["capability_key"]))
    assert dispatched["dispatch_status"] in {"DISPATCHED", "APPLIED"}
    reconcile_hash = _finalize(_cli_write(contracts["capabilityGate"], "reconcile_capability", capability["capability_key"]))
    applied = json.loads(_cli_call(contracts["capabilityGate"], "get_capability_json", capability["capability_key"]))
    assert applied["dispatch_status"] == "APPLIED"
    assert applied["consumed"] is True
    assert int(applied["dispatch_count"]) == 1
    assert applied["action_digest"]
    status = json.loads(_cli_call(contracts["protectedVault"], "get_status_json"))
    assert status["protected_action_paused"] is True
    during_action_key = f"LIVE-ACTION-{stamp}-DURING"
    during_output = _cli_write(contracts["protectedVault"], "execute_protected_action", during_action_key)
    during_hash = during_output.split("Write Transaction Hash:", 1)[1].strip().splitlines()[0].strip()
    with pytest.raises(AssertionError):
        _finalize_hash(during_hash)

    pause_until = int(json.loads(_cli_call(contracts["protectedVault"], "get_status_json"))["protected_action_paused_until"])
    while int(time.time()) < pause_until:
        time.sleep(min(15, max(1, pause_until - int(time.time()))))
    after_action_key = f"LIVE-ACTION-{stamp}-AFTER"
    after_action_hash = _finalize(_cli_write(contracts["protectedVault"], "execute_protected_action", after_action_key))
    after_action_record = json.loads(_cli_call(contracts["protectedVault"], "get_protected_action_json", after_action_key))
    final_status = json.loads(_cli_call(contracts["protectedVault"], "get_status_json"))
    assert after_action_record["action_key"] == after_action_key
    assert final_status["protected_action_paused"] is False
    print(json.dumps({
        "charter": charter,
        "incident": incident,
        "assessment": assessment_hash,
        "issuanceChildren": assessment_children,
        "capability": record["capability_key"],
        "execution": execute_hash,
        "protectedChildren": child_hashes,
        "reconcile": reconcile_hash,
        "beforeAction": before_action_hash,
        "duringAction": during_hash,
        "afterAction": after_action_hash,
        "finalStatus": final_status,
    }))
