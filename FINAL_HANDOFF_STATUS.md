# EXIGENT final handoff

## Current status

The current architecture is a non-custodial protected-action target. The
target stores no user funds and emits no external payout.

Current repository branch: `main`.

Current evidence commit: `b010917ffac4bea1518fac28d523986c01c4e61a`.

Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)

Vercel deployment: `dpl_DDgwTdaGbVuR159gAWHHEMgjdp63` (`READY`)

The production `/api/build-info` endpoint reports this deployment and frontend
source `de43a81c11ff37141680dcea1113a094338fb943`.

## Current contracts

| Contract | Address |
| --- | --- |
| CharterRegistry | `0xcb07C70A9f27b885031ab09693eC9AB49FE29ad5` |
| ExigencyEngine | `0x87Db5c9eBfe51c790572E77bEbe4e77A382f5234` |
| CapabilityGate | `0x3e3002E2955510171CC9e6373616a5e1A5439CA8` |
| ProtectedVault | `0xA4b7b2B65CcC436c2CaE6e2d0fE66f45e9bBAbBb` |

Network: Studionet 61999. The verified public deployment record is
`deployment-manifest.public.json`; all four deployed sources match it exactly.

## Steward authorization boundary

Creating a fresh protocol key does not grant authority over an existing
protected target. `ProtectedVault` stores its deployment wallet as the target
governance address. `ExigencyEngine` requires the charter owner to match target
governance before capability issuance. `ProtectedVault` independently checks
the capability holder against governance before applying the emergency pause.

The unrelated-wallet test
`test_unrelated_wallet_cannot_pause_target_through_configured_gate` passes.

Corrected source: [security-fix commit](https://github.com/Bibidee/exigency/commit/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2).

## Current health evidence

Deployment health: [37054512946](https://github.com/Bibidee/exigency/actions/runs/37054512946) — `SUCCESS`.

It verified production routes `/`, `/command`, and `/vault`, Studionet RPC,
chain ID `61999`, all four contract reads, target readability, an unpaused
protected target, and `4/4` deployed source byte matches.

Current live counts on this fresh deployment:

- charters: `0`
- incidents: `0`
- capabilities: `0`
- protectedActionCount: `0`

## Historical pre-governance-fix lifecycle

The lifecycle records `CI-LIVE-1790816856`, `CI-INC-1790816856`, and
`EXC-CI-INC-1790816856` were executed against the previous deployment and are
retained only as historical evidence. They are not claimed as live proof of
the current target-governance deployment. Missing intermediate hashes remain
`NOT RECORDED`.

## Test baseline

Exact-head CI: [37053963817](https://github.com/Bibidee/exigency/actions/runs/37053963817) — `SUCCESS`.

- Unit: 14 passed
- Direct Mode: 29 passed
- Browser: 9 passed
- Contract lint and validation: passed
- Typecheck: passed
- Production build: passed

Browser mocks are test-only and unavailable in production code paths; all
`__EXIGENT_E2E_MOCK__` behavior is gated away from production.

## Limitations

- Live failed-payout recovery is not a feature because the target does not
  transfer or custody GEN.
- Five moderate transitive npm advisories remain; no unsafe forced upgrade was
  applied.
- Some historical lifecycle transaction hashes remain `NOT RECORDED`.
