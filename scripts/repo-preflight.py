"""Fail-fast repository hygiene checks used before contract/frontend validation."""

from __future__ import annotations

import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    manifest_path = ROOT / "deployment-manifest.generated.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        assert manifest["network"] == "studionet"
        assert manifest["chainId"] == 61999
        assert manifest["rpc"] == "https://studio.genlayer.com/api"
        assert manifest["expectedLocalCli"] == "0.39.1"
        assert manifest["jsSdk"] == "1.1.8"
        assert len(manifest["contracts"]) == 4
        assert all(str(value).startswith("0x") for value in manifest["contracts"].values())

    forbidden = ("61997", "studio-dev.genlayer.com", "Studio Dev")
    checked = [ROOT / ".env.example", ROOT / "gltest.config.yaml", ROOT / "package.json"]
    checked.extend((ROOT / "app").rglob("*.ts"))
    checked.extend((ROOT / "components").rglob("*.tsx"))
    checked.extend((ROOT / "lib").rglob("*.ts"))
    for path in checked:
        text = path.read_text(encoding="utf-8")
        for marker in forbidden:
            assert marker not in text, f"forbidden deployment marker {marker!r} in {path}"

    secret_markers = ("PRIVATE_KEY=", "PRIVATE_KEY:", "MNEMONIC=", "SEED_PHRASE=")
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in {".git", "node_modules", ".next", ".python312", ".cache", "artifacts"} for part in path.parts):
            continue
        if path.resolve() == Path(__file__).resolve():
            continue
        if path.name in {".env.local", ".env.generated"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        assert not any(marker in text for marker in secret_markers), f"possible secret in {path}"

    print("EXIGENT repository preflight: PASS (Studionet 61999, no forbidden network markers or committed key markers)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
