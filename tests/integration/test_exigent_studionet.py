"""Opt-in live Studionet smoke checks.

These checks use the repository-local GenLayer CLI and the deployed manifest;
they do not mock contract state.  The full transaction lifecycle evidence is
recorded separately in REVIEW_EVIDENCE.md because it uses fresh, expiring
capabilities and must not be replayed automatically by CI.
"""

import json
import os
import subprocess
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "deployment-manifest.generated.json"


pytestmark = pytest.mark.skipif(
    os.environ.get("EXIGENT_RUN_LIVE_INTEGRATION") != "1",
    reason="set EXIGENT_RUN_LIVE_INTEGRATION=1 to query live Studionet",
)


def _cli_call(address: str, method: str, *args: str) -> str:
    command = [
        "npx.cmd" if os.name == "nt" else "npx",
        "--no-install",
        "genlayer",
        "call",
        address,
        method,
        "--rpc",
        "https://studio.genlayer.com/api",
    ]
    if args:
        command.extend(["--args", *args])
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=True)
    marker = "Result:\n"
    if marker not in result.stdout:
        raise AssertionError(f"CLI did not return a result for {method}: {result.stdout}")
    return result.stdout.split(marker, 1)[1].split("\n", 1)[0].strip()


def _cli_write(address: str, method: str, *args: str) -> str:
    command = [
        "npx.cmd" if os.name == "nt" else "npx",
        "--no-install",
        "genlayer",
        "write",
        address,
        method,
        "--rpc",
        "https://studio.genlayer.com/api",
    ]
    if args:
        encoded = [json.dumps(arg) if any(ch.isspace() for ch in arg) else arg for arg in args]
        command.extend(["--args", *encoded])
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=True)
    return f"{result.stdout}\n{result.stderr}"


def _finalize(stdout: str) -> None:
    marker = "Write Transaction Hash:"
    assert marker in stdout, stdout
    tx_hash = stdout.split(marker, 1)[1].strip().splitlines()[0].strip()
    assert tx_hash.startswith("0x"), stdout
    command = [
        "npx.cmd" if os.name == "nt" else "npx",
        "--no-install",
        "genlayer",
        "receipt",
        tx_hash,
        "--status",
        "FINALIZED",
        "--rpc",
        "https://studio.genlayer.com/api",
    ]
    subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=True)


def test_live_studionet_manifest_and_contract_reads():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["network"] == "studionet"
    assert manifest["chainId"] == 61999
    assert manifest["rpc"] == "https://studio.genlayer.com/api"

    contracts = manifest["contracts"]
    assert _cli_call(contracts["charterRegistry"], "list_charter_keys")
    status = json.loads(_cli_call(contracts["protectedVault"], "get_status_json"))
    assert status["gate_address"].lower() == contracts["capabilityGate"].lower()
    assert isinstance(status["withdrawals_paused"], bool)
    assert isinstance(status["deposits_paused"], bool)


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
    source = "https://raw.githubusercontent.com/Bibidee/exigency/main/README.md"

    _finalize(_cli_write(
        contracts["charterRegistry"],
        "publish_charter",
        charter, protocol, "EXIGENT CI", target,
        "The source must clearly describe the EXIGENT emergency authority protocol and its trigger conditions for this automated integration run.",
        "The evidence source must be publicly retrievable and contain the declared trigger language.",
        "raw.githubusercontent.com", "PAUSE_WITHDRAWALS", "30", "30", "1",
    ))
    import time
    time.sleep(70)
    _finalize(_cli_write(contracts["charterRegistry"], "activate_charter", charter))
    _finalize(_cli_write(
        contracts["exigencyEngine"], "open_incident", incident, charter,
        "PAUSE_WITHDRAWALS", "10",
        "Automated live integration incident verifying source-grounded emergency authority and exact capability execution.",
        json.dumps([source]),
    ))
    _finalize(_cli_write(contracts["exigencyEngine"], "assess_incident", incident))
    record = {}
    for _ in range(36):
        record = json.loads(_cli_call(contracts["exigencyEngine"], "get_incident_json", incident))
        if record.get("status") == "TRIGGER_CONFIRMED":
            break
        time.sleep(5)
    assert record["status"] == "TRIGGER_CONFIRMED"
    assert record["capability_key"]
    capability = json.loads(_cli_call(contracts["capabilityGate"], "get_capability_json", record["capability_key"]))
    _finalize(_cli_write(
        contracts["capabilityGate"], "execute_capability", capability["capability_key"],
        capability["target"], capability["action_class"], str(capability["duration_minutes"]),
    ))
    status = json.loads(_cli_call(contracts["protectedVault"], "get_status_json"))
    assert status["withdrawals_paused"] is True
