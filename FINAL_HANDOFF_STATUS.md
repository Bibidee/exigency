# EXIGENT Final Handoff Status

## Authoritative current update — 2026-09-29 (live accounting proof)

- Payout-child fix is committed as `b26a50b` and deployed in READY Vercel deployment `dpl_8iVqf4Zm3hwQNxz2ByYghYMF21hK` at [exigency.vercel.app](https://exigency.vercel.app).
- Live browser proof completed on Studionet 61999: deposit `0.01 GEN` finalized; withdrawal parent `0.005 GEN` finalized; payout child `0.005 GEN` finalized and credited to the connected wallet; settlement finalized.
- Authoritative final state: withdrawal `W-0x4a7d76b8c4668a3426d6d54ec24b41fa87b532f5-0` is `SETTLED`, active withdrawal is empty, and both total credits and holder credit are `5000000000000000` wei.
- The frontend now handles GenLayer native payout-child receipts correctly (`FINALIZED` + `value_credited: true`) and provides post-reload payout reconciliation before enabling settlement.
- The automated private-key live accounting and funded write lifecycle remain explicitly opt-in; no secret was available to run those scripts in this workspace. The browser-approved accounting lifecycle is verified above.

## Authoritative current update — 2026-09-29 (latest)

- Final source commit is `e8803dad778b59161ba52cfa516a7859d2a05539`; [GitHub Actions run 36629523688](https://github.com/Bibidee/exigency/actions/runs/36629523688) is green across all four jobs.
- Local checks passed: unit **14/14**, Direct Mode **18/18**, frontend typecheck, and production build. Production Playwright passed **8/8** with network access enabled.
- Public Vercel deployment `dpl_BZmipxwcFzQYew8KQBu4VQE3iUNg` is READY and aliased to `https://exigency.vercel.app`. Health checks and exact deployed-source verification both pass for Studionet 61999.
- The new payout flow is fail-closed: the app discovers and proves the withdrawal payout child before settlement, exposes recoverable failure/retry state, and prevents duplicate settlement. Capability execution likewise proves triggered children before success.
- The only unclaimed items are account-specific: a fresh funded live deposit/withdrawal write run and the opt-in funded live lifecycle automation. No new financial write was initiated during this remediation pass.

## Authoritative current update — 2026-09-29

- Final source commit is `5ed405608ce9270e0ca8afedf3f7672048462751`; GitHub Actions run `36624668894` is green across Python/direct tests, contract validation, frontend build, and Playwright.
- The current four-contract Studionet 61999 deployment is the one in `deployment-manifest.public.json`, and exact source verification passes.
- Vercel is public again: deployment protection is disabled, deployment `dpl_FCXr28DkQPgpuzX8dtQ6tigvDXuG` is READY, and Brave verified `/`, `/command`, and `/vault`.
- Health monitoring is present at `.github/workflows/health.yml` and runs every six hours.
- The remaining account-specific item is a new funded live deposit/withdrawal run against the fresh vault; the earlier authorized live run remains recorded as proof, but no new financial write was performed here.

## Current update — 2026-09-28

- Vault runtime crash fixed: RPC `get_credit` values are normalized to `BigInt` before formatting, eliminating the observed mixed-number arithmetic exception.
- Wallet restore/listener lifetime is stable and Vault state is fail-closed (`LOADING`, `OPEN`/`PAUSED`, or `UNKNOWN / READ FAILED`).
- Provenance verification is fail-closed and the current four-contract deployment matches source exactly.

- CI is green on commit `bc39a9b` (GitHub Actions run `36468578851`): repository preflight, Python/unit/direct tests, contract lint/validation, frontend typecheck, and production build all pass.
- Current finalized Studionet 61999 deployment: Registry `0xBAeB7D6B7dC560A3b7AeaCdBA96c29c46BE6dB21`, Gate `0xa7181624F1cbFaedDeefb8Ff5811AF4Ee660357e`, Engine `0xD312EbD571fD3353870098F902b1bdafA7457cA1`, Vault `0x3778A8b18B0DF4288464DF6A745F5569668bdE1D`; bind transaction `0x690d58cbb13272bf9de545b4ef0fbe02554446bac0f669508a6ba394be87f1f4`.
- Exact deployed-source verification passes for all four current contracts.
- Vercel deployment `dpl_98ABkummouzyatSdWPqebGc4gCy8` is READY and public routes `/`, `/command`, and `/vault` were verified in Brave.
- Remaining account-specific verification: opt-in automated live write lifecycle and live payable deposit/withdrawal transactions require an unlocked funded wallet; these were not initiated automatically during this pass.

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
