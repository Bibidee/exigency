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

## Verified in the build environment

See `VALIDATION_REPORT.md` and `REVIEW_EVIDENCE.md`. In this workspace, the local CLI, toolchain guard, TypeScript typecheck and production build pass. Python contract syntax and test execution remain pending because no Python executable is available.

## Intentionally left for Claude/Codex / account-specific execution

This workspace has no Python executable and no deployment wallet/account configuration. Direct Mode, GenVM lint/validate, Studionet deployment, real wallet lifecycle, negative/adversarial live cases and deployed-source provenance remain account/environment-specific.

No deployment address, transaction hash, green Direct Mode result or live-app claim has been fabricated.
