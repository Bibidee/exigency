# Validation Report

This report records only checks actually executed in the build environment used to create this handoff.

## Passed here

- `python -m py_compile contracts/*.py` — **PASS** for all four contracts.
- `pytest tests/unit -q` — **10/10 PASS**.
- TypeScript/TSX syntax parse using the locally available TypeScript compiler — **19 source files parsed, 0 syntax-error files**.
- Runtime/source configuration inspection confirms the frontend network constant is **Studionet 61999**, RPC `https://studio.genlayer.com/api`, and no 61997 value is present in `lib/config.ts`.
- The repository contains no configured deployment addresses or mock contract-state fallback. Writes fail clearly until real addresses are supplied.
- `npm install` — completed with the pinned package versions; npm reported 8 audit findings.
- `npx --no-install genlayer --version` — **0.39.1**.
- `npm run toolchain:check` — **PASS**.
- `npm run typecheck` — **PASS**.
- `npm run build` — **PASS**.

## Could not be executed in this environment

The current Windows workspace has no Python executable available to run the contract suite. Node dependencies were available and installed.

### Python dependency installation

`python -m pip install -r requirements.txt` was attempted and stopped while cloning `genlayer-py` because `github.com` could not be resolved. Because the GenLayer Python/testing dependencies could not be installed here, these checks remain for the handoff machine/CI:

- `pytest tests/direct -v`
- `genvm-lint check contracts/*.py`
- `genvm-lint validate contracts/*.py`

### Remaining contract and live checks

- `python -m py_compile contracts/*.py`
- `pytest tests/unit -q`
- `pytest tests/direct -v`
- `genvm-lint check` / `genvm-lint validate`
- Studionet deployment and lifecycle evidence
- `npm run source:verify` (requires a real deployment manifest)

## Deployment status

- Studionet deployment: **not attempted**. No wallet/private key is assumed in this build environment.
- Contract addresses: intentionally blank until real deployment.
- Live wallet lifecycle: not executed here.
- Deployed-source provenance: script included as `npm run source:verify`, but it requires a real `deployment-manifest.generated.json` from Studionet deployment.

## Important pre-submission rule

Do not convert any pending item above into a claimed pass without actually running it. The repository is designed so Claude/Codex can install the pinned 61999 toolchain, run Direct Mode and lint/validate, deploy, exercise the real lifecycle, and update this report with observed evidence.
