from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]


def test_frontend_is_61999_only():
    config=(ROOT/"lib"/"config.ts").read_text()
    assert 'chainId: 61999' in config
    assert 'https://studio.genlayer.com/api' in config
    assert '61997' not in config


def test_no_mock_contract_fallback():
    pages="\n".join(p.read_text() for p in (ROOT/"app").rglob("*.tsx"))
    assert "fakeContractState" not in pages
    assert "No mocked contract results are shown" in pages
