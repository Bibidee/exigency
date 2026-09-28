# EXIGENT Final Handoff Status

## Built in this handoff

- Four-contract architecture: `CharterRegistry`, `ExigencyEngine`, `CapabilityGate`, `ProtectedVault`.
- Stable Studionet-only configuration for chain **61999**.
- Repository-local GenLayer CLI pinned to **0.39.1**.
- `genlayer-js` **1.1.8**, `genlayer-py v0.18`, testing suite `v0.29`, linter `0.11.0`, Python `3.12+` target.
- Stable GenVM runner hash pinned in all four contract sources.
- Immutable charter versioning with activation delay, protocol-owner lock and rollback prevention.
- Existing incidents remain bound to their frozen charter digest after later charter activation.
- Approved-host evidence boundary with independent validator web fetching.
- Substantive validator reconstruction and semantic comparison, not format-only validation.
- Code-derived per-source HTTP status/content SHA-256 commitments and aggregate evidence commitment.
- Finality-only capability issuance.
- Holder/target/action/duration/charter-bound, expiring, single-use capability execution.
- Finality-only protected-vault emergency child action.
- Protected test-GEN vault with deposit/withdraw paths and no direct admin emergency bypass.
- Full custom Next.js application with original EXIGENT routes and visual system.
- Injected EIP-1193 wallet flow with explicit Studionet 61999 switch/add handling.
- Fee estimation before writes and visible transaction/consensus status polling.
- Deployment script with hard 61999 guard and generated environment/manifest files.
- Deployed-source provenance verification script.
- Synthetic source fixtures for reproducible testing plus guidance to use independent public evidence in reviewer demonstration.
- CI configuration, unit tests, Direct Mode test scaffolding, review/security/architecture/runbook documentation.

## Verified in the current workspace

See `VALIDATION_REPORT.md` and `REVIEW_EVIDENCE.md`. The local CLI is 0.39.1, toolchain guard, typecheck and production build pass; unit tests are 10/10 and Direct Mode is 8/8. The repository remote is configured and the final source commit is `17654be`. Four contracts are recorded on Studionet 61999 and the production frontend is live at https://exigency.vercel.app.

## Still required before final reviewer-ready completion

- The real `tests/integration/test_exigent_studionet.py` smoke test now runs against live Studionet; the exact read-only `gltest tests/integration -v -s --network studionet` command passed. The write lifecycle is implemented and opt-in, but its latest run did not complete because Studionet finality stalled; no automated write pass is claimed.
- Manual live evidence includes finalized charter publication, delayed activation rejection/success, incident, semantic assessment, capability child, exact execution, vault pause, replay rejection, direct-vault rejection and no-authority evidence. Deposit/withdrawal value accounting is covered by passing Direct Mode tests; a wallet-mediated live deposit/withdrawal remains account/browser-specific and is not claimed as completed.
- GenVM lint and validate now pass for all four contracts; the results are recorded in `REVIEW_EVIDENCE.md`.
- A live no-authority lifecycle has been observed and recorded. During it, the stable web response shape exposed a compatibility defect; the engine now accepts both CLI-native evidence arrays and stable response status/body shapes, with 13 unit tests passing and a fresh four-contract deployment finalized.
- The newest deployment has a manually observed complete positive lifecycle: finalized `TRIGGER_CONFIRMED`, capability issuance, exact one-time execution, finalized ProtectedVault pause child, actual paused state, and replay rejection. Exact values are in `REVIEW_EVIDENCE.md`.
- Exact deployed-source verification passes for all four contracts, and Vercel production has been redeployed and verified at https://exigency.vercel.app.
- GitHub Actions is green for the final wallet-compatible commit. The Brave connection path now requests the account before network switching, formats provider errors, avoids the unsupported `wallet_getSnaps` handshake, and preserves the bottom-left wallet control.
- Re-run exact deployed-source provenance when the Studionet RPC exposes contract bytes; the latest run could not retrieve them.
- Update this file and `REVIEW_EVIDENCE.md` only with observed values.
