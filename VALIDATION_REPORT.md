# Validation report

## Verdict scope

The current deployment is validated as a non-custodial emergency protected
action. It does not claim GEN deposits, payouts, refunds, or live failed-payout
recovery. The target stores no user value and has no external payout path.

## Deployed stack

- Network: Studionet 61999
- Registry: `0xA4dba5B0572B3D721955Ce3A9E3dc46F791e4C92`
- Engine: `0x903f895E256817aBFE97f101292B94F85d0b59BA`
- Gate: `0xE383404e8C00868A86BD412F4e72Cb13328Ed2EF`
- Protected vault: `0xF3dC371E50c296c6Ef1067eAe95104F864F391B3`
- Protected route: `0x7217760864796a1CaeDAaFB418b7d168a91331a4`
- Source commit for this deployed contract stack:
  `5c7664b59f6ac4ea6839dbf85e2ad3174fec96ef`
- Source verification: 5/5 exact byte matches

The committed `deployment-manifest.public.json` is the authoritative current
deployment record.

## Steward authorization fix

Creating a fresh protocol key does not grant authority over an existing
protected target. `ProtectedVault` stores its deployment wallet as governance.
`ExigencyEngine` requires the charter owner to match target governance before
capability issuance. `ProtectedVault` independently verifies the capability
holder against governance before applying the emergency pause.

Negative test:
`test_unrelated_wallet_cannot_pause_target_through_configured_gate`

Result: `PASS`.

Corrected source: [security-fix commit](https://github.com/Bibidee/exigency/commit/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2).

## Current target checks

Direct Mode covers Gate-only emergency pause, unique protected-action
execution, replay rejection, direct sender/origin enforcement, pause and
expiry behavior, duplicate capability idempotence, conflicting digest
rejection, holder isolation, invalid-key rejection, and the unrelated-wallet
governance rejection.

## Current health evidence

Production deployment: `dpl_5xX6ea47LCRVdt7i7cCgvYi5FsU8` (`READY`).
The production `/api/build-info` endpoint reports frontend source
`e6a7a9f8b920dafcaad57304c1d763072c580217`.

It verified `/`, `/command`, and `/vault`, Studionet RPC, chain ID `61999`, all
five contract reads, both target bindings, the current protected-route state,
and `5/5` deployed source byte matches.

Current counts on this fresh deployment are:

- charters: `5`
- incidents: `4`
- capabilities: `1`
- protected route: `route_disabled=true`, `route_execution_count=0`

## Historical pre-governance-fix lifecycle

The lifecycle records `CI-LIVE-1790816856`, `CI-INC-1790816856`, and
`EXC-CI-INC-1790816856` belong to the previous deployment. They are retained
only as historical evidence and are not claimed as live proof of the current
target-governance deployment. Missing intermediate hashes remain
`NOT RECORDED`.

## Frontend

- Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Deployment: `dpl_5xX6ea47LCRVdt7i7cCgvYi5FsU8`
- Deployment state: `READY`
- Frontend source from `/api/build-info`:
  `e6a7a9f8b920dafcaad57304c1d763072c580217`

## Test results

- Unit: 16 passed
- Direct Mode: 32 passed in CI
- Browser: 9 passed
- Contract lint and validation: passed
- Typecheck: passed
- Build: passed

Exact-head CI: [37053963817](https://github.com/Bibidee/exigency/actions/runs/37053963817) — `SUCCESS`.

Browser mocks remain development/test-only and are not available in production.

## Limitations

- No live failed payout is attempted because the current target has no payout
  path; the safety decision is structural, not a fabricated failure proof.
- Four moderate transitive GenLayer/Vitest tooling advisories remain; high and
  critical findings are cleared. No unsafe forced GenLayer downgrade was
  applied.
- Some historical lifecycle hashes remain `NOT RECORDED`.
