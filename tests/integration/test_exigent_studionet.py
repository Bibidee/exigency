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
